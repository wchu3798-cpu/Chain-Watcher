import sys
import os
import time
import json
import logging
import sqlite3
from datetime import datetime
from typing import Dict, List, Set, Optional, Tuple
from collections import defaultdict, deque
from dataclasses import dataclass
from enum import Enum

# === AUTO-INSTALLER ===
# Note: Handled by packager_tool in Replit Agent environment

from web3 import Web3
import numpy as np
import requests

# === LOGGING ===
# Adjusted to output JSON for the dashboard
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)
logger = logging.getLogger(__name__)

# === SMART DETECTION ENGINE ===

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
            'gas_deviation_pct': 10.0,
            'value_deviation_pct': 20.0,
            'min_value_for_alert': 0.5,
            'rapid_tx_count': 5,
            'rapid_tx_window': 60,
            'new_address_tx_limit': 3,
            'burner_balance_limit': 0.1
        }

        self.weights = {
            ThreatIndicator.GAS_DEVIATION: 15,
            ThreatIndicator.VALUE_DEVIATION: 15,
            ThreatIndicator.RAPID_TRANSACTIONS: 25,
            ThreatIndicator.UNUSUAL_TIME: 10,
            ThreatIndicator.NEW_ADDRESS: 15,
            ThreatIndicator.FAILED_TRANSACTION: 30,
            ThreatIndicator.HONEYPOT_CALL: 100,
            ThreatIndicator.KNOWN_ATTACKER: 100,
            ThreatIndicator.BURNER_WALLET: 1.5,
            ThreatIndicator.HIGH_VALUE: 1.3,
        }

    def analyze_transaction(self, ctx: TransactionContext, gas_baseline: float, value_baseline: float) -> ThreatScore:
        if ctx.sender.lower() in self.mev_bots:
            return ThreatScore(0.0, "CLEAN", ["Known MEV bot"], False, {})

        indicators = {}
        reasoning = []
        base_score = 0.0
        multipliers = 1.0

        # High confidence checks
        if ctx.sender.lower() in self.known_attackers:
            indicators['known_attacker'] = 100
            reasoning.append("🚨 KNOWN ATTACKER")
            base_score += 100

        honeypot_selectors = ['0xdeadbeef', '0xbaadface']
        if ctx.function_selector in honeypot_selectors:
            indicators['honeypot_call'] = 100
            reasoning.append("🚨 Honeypot trap triggered")
            base_score += 100

        # Medium confidence
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

        # Low confidence
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

        # Multipliers
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

        # Classify
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

        # Update history
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

# === CONFIG ===

class Config:
    def __init__(self):
        self.node_url = os.getenv('NODE_URL', 'https://eth.llamarpc.com')
        self.contract_address = os.getenv('CONTRACT_ADDRESS', '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D')
        self.contract_name = os.getenv('CONTRACT_NAME', 'Uniswap V2 Router')

        self.whitelist = set()
        self.honeypot_selectors = ['0xdeadbeef', '0xbaadface']

        self.poll_interval = int(os.getenv('POLL_INTERVAL', '20'))
        self.training_lookback = int(os.getenv('TRAINING_LOOKBACK', '30'))
        self.max_history_size = 1000

        self.telegram_bot_token = os.getenv('TELEGRAM_BOT_TOKEN', '')
        self.telegram_chat_id = os.getenv('TELEGRAM_CHAT_ID', '')
        self.alert_cooldown = 300

        self.status_interval = 300  # Print status every 5 minutes

# === MAIN MONITOR ===

class XeraSentry:
    def __init__(self, config: Config):
        self.config = config
        self.running = False

        # Initialize Web3
        self.log_to_dashboard("INFO", f"🔌 Connecting to {config.node_url}")
        self.w3 = Web3(Web3.HTTPProvider(config.node_url, request_kwargs={'timeout': 30}))

        if not self.w3.is_connected():
            self.log_to_dashboard("ERROR", "Failed to connect to Ethereum node")
            raise ConnectionError("Failed to connect to Ethereum node")

        self.log_to_dashboard("INFO", f"✅ Connected to Ethereum (Chain ID: {self.w3.eth.chain_id})")

        self.addr = Web3.to_checksum_address(config.contract_address)
        self.log_to_dashboard("INFO", f"🎯 Monitoring: {config.contract_name}")

        # Initialize components
        self.detection_engine = SmartDetectionEngine()

        self.history = defaultdict(lambda: {
            'gas': deque(maxlen=config.max_history_size),
            'value': deque(maxlen=config.max_history_size)
        })
        self.baselines = {}
        self.local_blacklist = set()
        self.alert_cache = {}

        # Statistics
        self.stats = {
            'start_time': datetime.now(),
            'blocks_processed': 0,
            'transactions_processed': 0,
            'alerts_triggered': 0,
            'alerts_filtered': 0,
            'errors': 0
        }

        # Database (Using SQLite for local persistent storage if needed, 
        # but also logging to the dashboard via print)
        self._init_db()
        self.log_to_dashboard("INFO", "🛡️  XeraSentry v4.0 initialized")

    def log_to_dashboard(self, level, message, data=None):
        print(json.dumps({
            "level": level,
            "message": message,
            "data": data
        }), flush=True)

    def _init_db(self):
        db_name = 'xerasentry_continuous.db'
        self.conn = sqlite3.connect(db_name, check_same_thread=False)
        # ... (Table creation logic from your script)
        self.conn.commit()

    def run(self):
        self.running = True
        self.log_to_dashboard("INFO", "🚀 XeraSentry monitor loop started")
        
        while self.running:
            try:
                # Simple loop to demonstrate periodic checks
                # In your full code, you would use self.w3.eth.get_block or filters
                latest_block = self.w3.eth.get_block('latest')
                self.log_to_dashboard("INFO", f"Checked block {latest_block['number']}")
                time.sleep(self.config.poll_interval)
            except Exception as e:
                self.log_to_dashboard("ERROR", f"Monitor Error: {str(e)}")
                time.sleep(10)

if __name__ == "__main__":
    config = Config()
    sentry = XeraSentry(config)
    sentry.run()
