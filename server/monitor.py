import sys
import os
import json
import asyncio
import logging
import random
from datetime import datetime
from typing import Dict, List, Optional
from collections import defaultdict, deque
from dataclasses import dataclass
from enum import Enum

from web3 import AsyncWeb3
from web3.providers import AsyncHTTPProvider
import numpy as np
import requests

# === LOGGING ===
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)
logger = logging.getLogger(__name__)

class ThreatIndicator(Enum):
    GAS_DEVIATION = "gas_deviation"
    VALUE_DEVIATION = "value_deviation"
    RAPID_TRANSACTIONS = "rapid_transactions"
    UNUSUAL_TIME = "unusual_time"
    NEW_ADDRESS = "new_address"
    FAILED_TRANSACTION = "failed_transaction"
    HONEYPOT_CALL = "honeypot_call"
    KNOWN_ATTACKER = "known_attacker"
    BURNER_WALLET = "burner_wallet"
    HIGH_VALUE = "high_value"

@dataclass
class ThreatScore:
    total_score: float
    confidence: str
    reasoning: List[str]
    should_alert: bool
    indicators: Dict[str, float]

@dataclass
class TransactionContext:
    tx_hash: str
    sender: str
    gas_used: int
    value_eth: float
    timestamp: datetime
    function_selector: str
    status: int
    sender_nonce: int
    sender_balance: float
    is_contract: bool

class SmartDetectionEngine:
    def __init__(self):
        self.known_attackers = {
            '0x1da5821544e25c636c1417ba96ade4cf6d2f9b5a',
            '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
        }
        self.mev_bots = {
            '0x000000000035b5e5ad9019092c665357240f594e',
        }
        self.address_history = defaultdict(lambda: {
            'tx_count': 0,
            'first_seen': None,
            'total_value': 0.0
        })
        self.recent_txs = deque(maxlen=1000)
        self.thresholds = {
            'gas_deviation_pct': 5.0,
            'value_deviation_pct': 10.0,
            'min_value_for_alert': 0.1,
            'rapid_tx_count': 3,
            'rapid_tx_window': 120,
            'new_address_tx_limit': 5,
            'burner_balance_limit': 0.5
        }

    def analyze_transaction(self, ctx: TransactionContext, gas_baseline: float, value_baseline: float) -> ThreatScore:
        if ctx.sender.lower() in self.mev_bots:
            return ThreatScore(0.0, "CLEAN", ["Known MEV bot"], False, {})

        indicators = {}
        reasoning = []
        base_score = 0.0
        multipliers = 1.0

        if ctx.sender.lower() in self.known_attackers:
            indicators['known_attacker'] = 100
            reasoning.append("🚨 KNOWN ATTACKER")
            base_score += 100

        honeypot_selectors = ['0xdeadbeef', '0xbaadface']
        if ctx.function_selector in honeypot_selectors:
            indicators['honeypot_call'] = 100
            reasoning.append("🚨 Honeypot trap triggered")
            base_score += 100

        recent = [tx for tx in self.recent_txs
                 if tx['sender'] == ctx.sender and
                 (ctx.timestamp - tx['timestamp']).total_seconds() < self.thresholds['rapid_tx_window']]

        if len(recent) >= self.thresholds['rapid_tx_count']:
            indicators['rapid_transactions'] = 25
            reasoning.append(f"🤖 Rapid transactions: {len(recent)}+")
            base_score += 25

        if ctx.status == 0:
            indicators['failed_transaction'] = 30
            reasoning.append("❌ Transaction failed")
            base_score += 30

        history = self.address_history[ctx.sender]
        if history['tx_count'] < self.thresholds['new_address_tx_limit'] and ctx.value_eth > self.thresholds['min_value_for_alert']:
            indicators['new_address'] = 15
            reasoning.append(f"🆕 New address with {ctx.value_eth:.4f} ETH")
            base_score += 15

        if 3 <= ctx.timestamp.hour <= 6:
            indicators['unusual_time'] = 10
            reasoning.append(f"🌙 Unusual hour ({ctx.timestamp.hour}:00 UTC)")
            base_score += 10

        gas_deviation = abs((ctx.gas_used - gas_baseline) / gas_baseline * 100) if gas_baseline > 0 else 0
        if gas_deviation > self.thresholds['gas_deviation_pct']:
            indicators['gas_deviation'] = 15
            reasoning.append(f"📊 Gas {gas_deviation:.1f}% above baseline")
            base_score += 15

        value_deviation = abs((ctx.value_eth - value_baseline) / value_baseline * 100) if value_baseline > 0 else 0
        if value_deviation > self.thresholds['value_deviation_pct'] and ctx.value_eth > self.thresholds['min_value_for_alert']:
            indicators['value_deviation'] = 15
            reasoning.append(f"💰 Value {value_deviation:.1f}% above baseline")
            base_score += 15

        if ctx.sender_nonce < 5 and ctx.sender_balance < self.thresholds['burner_balance_limit']:
            indicators['burner_wallet'] = 1.5
            reasoning.append(f"🔥 Burner wallet")
            multipliers *= 1.5

        if ctx.value_eth > 10.0:
            indicators['high_value'] = 1.3
            reasoning.append(f"💎 High value: {ctx.value_eth:.2f} ETH")
            multipliers *= 1.3

        if ctx.is_contract:
            indicators['contract_interaction'] = 1.2
            reasoning.append("📝 Sender is contract")
            multipliers *= 1.2

        total_score = base_score * multipliers

        if 'known_attacker' in indicators or 'honeypot_call' in indicators:
            confidence = "CRITICAL"
            should_alert = True
        elif total_score >= 96:
            confidence = "CRITICAL"
            should_alert = True
        elif total_score >= 76:
            confidence = "HIGH"
            should_alert = True
        elif total_score >= 51:
            confidence = "MEDIUM"
            should_alert = True
        else:
            confidence = "LOW"
            should_alert = False

        if history['first_seen'] is None:
            history['first_seen'] = ctx.timestamp
        history['tx_count'] += 1
        history['total_value'] += ctx.value_eth

        self.recent_txs.append({
            'sender': ctx.sender,
            'timestamp': ctx.timestamp,
            'function_selector': ctx.function_selector
        })

        return ThreatScore(total_score, confidence, reasoning[:5], should_alert, indicators)

class Config:
    def __init__(self):
        self.node_url = os.getenv('NODE_URL', 'https://eth.llamarpc.com')
        self.contract_address = os.getenv('CONTRACT_ADDRESS', '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D')
        self.contract_name = os.getenv('CONTRACT_NAME', 'Uniswap V2 Router')
        self.poll_interval = int(os.getenv('POLL_INTERVAL', '12'))
        self.max_retries = 5

class XeraSentry:
    def __init__(self, config: Config):
        self.config = config
        self.running = False
        self.w3 = None
        self.detection_engine = SmartDetectionEngine()
        self.gas_history = deque(maxlen=100)
        self.value_history = deque(maxlen=100)

    def log_to_dashboard(self, level, message, data=None):
        print(json.dumps({
            "level": level,
            "message": message,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }), flush=True)

    def send_telegram_alert(self, message):
        token = os.getenv('TELEGRAM_BOT_TOKEN')
        chat_id = os.getenv('TELEGRAM_CHAT_ID')
        if not token or not chat_id:
            return
        try:
            url = f"https://api.telegram.org/bot{token}/sendMessage"
            requests.post(url, data={"chat_id": chat_id, "text": message}, timeout=10)
        except Exception as e:
            self.log_to_dashboard("ERROR", f"Telegram Alert Failed: {str(e)}")

    async def connect(self):
        retries = 0
        while retries < self.config.max_retries:
            try:
                self.log_to_dashboard("INFO", f"🔌 Connecting to {self.config.node_url} (Attempt {retries+1})")
                self.w3 = AsyncWeb3(AsyncHTTPProvider(self.config.node_url))
                if await self.w3.is_connected():
                    chain_id = await self.w3.eth.chain_id
                    self.log_to_dashboard("INFO", f"✅ Connected to Ethereum (Chain ID: {chain_id})")
                    return True
            except Exception as e:
                self.log_to_dashboard("ERROR", f"Connection failed: {str(e)}")
            
            retries += 1
            wait_time = min(2 ** retries + random.uniform(0, 1), 30)
            await asyncio.sleep(wait_time)
        return False

    async def process_block(self, block_number: int):
        try:
            block = await self.w3.eth.get_block(block_number, full_transactions=True)
            self.log_to_dashboard("INFO", f"🔍 Analyzing {len(block['transactions'])} transactions in block {block_number}")
            
            gas_baseline = np.median(list(self.gas_history)) if self.gas_history else 21000
            value_baseline = np.median(list(self.value_history)) if self.value_history else 0.1

            for tx in block['transactions']:
                if tx.get('to') and tx['to'].lower() == self.config.contract_address.lower():
                    try:
                        receipt = await self.w3.eth.get_transaction_receipt(tx['hash'])
                        sender = tx['from']
                        sender_balance = float(self.w3.from_wei(await self.w3.eth.get_balance(sender), 'ether'))
                        sender_nonce = await self.w3.eth.get_transaction_count(sender)
                        is_contract = len(await self.w3.eth.get_code(sender)) > 0
                        
                        ctx = TransactionContext(
                            tx_hash=tx['hash'].hex(),
                            sender=sender,
                            gas_used=receipt['gasUsed'],
                            value_eth=float(self.w3.from_wei(tx['value'], 'ether')),
                            timestamp=datetime.fromtimestamp(block['timestamp']),
                            function_selector=tx['input'][:10].hex() if tx['input'] else '0x',
                            status=receipt['status'],
                            sender_nonce=sender_nonce,
                            sender_balance=sender_balance,
                            is_contract=is_contract
                        )

                        score = self.detection_engine.analyze_transaction(ctx, gas_baseline, value_baseline)
                        
                        self.gas_history.append(ctx.gas_used)
                        self.value_history.append(ctx.value_eth)

                        if score.should_alert:
                            self.log_to_dashboard("WARN" if score.confidence != "CRITICAL" else "ERROR", 
                                f"⚠️ {score.confidence} THREAT: {ctx.tx_hash[:10]}", 
                                {
                                    "hash": ctx.tx_hash,
                                    "score": score.total_score,
                                    "confidence": score.confidence,
                                    "reasoning": score.reasoning,
                                    "indicators": score.indicators
                                }
                            )
                            if score.confidence in ["HIGH", "CRITICAL"]:
                                alert_msg = f"🚨 {score.confidence} THREAT DETECTED\n"
                                alert_msg += f"Hash: {ctx.tx_hash[:10]}...\n"
                                alert_msg += f"Score: {score.total_score}\n"
                                alert_msg += "Reasons:\n" + "\n".join([f"- {r}" for r in score.reasoning])
                                self.send_telegram_alert(alert_msg)
                        else:
                            self.log_to_dashboard("INFO", f"Clean interaction: {ctx.tx_hash[:10]}...", {
                                "hash": ctx.tx_hash,
                                "score": score.total_score,
                                "confidence": score.confidence
                            })

                    except Exception:
                        continue
                        
        except Exception as e:
            self.log_to_dashboard("ERROR", f"Block processing error: {str(e)}")

    async def run(self):
        if not await self.connect():
            self.log_to_dashboard("CRITICAL", "Maximum connection retries exceeded. Exiting.")
            return

        self.running = True
        self.log_to_dashboard("INFO", f"🚀 Monitoring contract: {self.config.contract_address}")
        
        last_processed_block = await self.w3.eth.block_number
        
        while self.running:
            try:
                current_block = await self.w3.eth.block_number
                
                if current_block > last_processed_block:
                    start_block = max(last_processed_block + 1, current_block - 5)
                    for bn in range(start_block, current_block + 1):
                        await self.process_block(bn)
                    last_processed_block = current_block
                
                await asyncio.sleep(self.config.poll_interval)
            except Exception as e:
                self.log_to_dashboard("ERROR", f"Runtime Loop Error: {str(e)}")
                await asyncio.sleep(10)

if __name__ == "__main__":
    config = Config()
    sentry = XeraSentry(config)
    asyncio.run(sentry.run())
