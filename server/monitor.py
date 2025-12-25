import time
import json
import requests
import sys
import random

def monitor():
    # Initial log
    print(json.dumps({
        "level": "INFO", 
        "message": "Initializing Blockchain Monitor...",
        "data": {"version": "1.0.0"}
    }), flush=True)
    
    time.sleep(1)

    while True:
        try:
            # Fetch Bitcoin Price
            response = requests.get("https://api.coindesk.com/v1/bpi/currentprice.json", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                price = data["bpi"]["USD"]["rate"]
                
                # Simulate some blockchain metrics
                block_height = 800000 + int(time.time() % 1000)
                gas_fee = random.randint(10, 100)
                
                log = {
                    "level": "INFO",
                    "message": f"BTC Price: ${price} | Block: {block_height}",
                    "data": {
                        "price": price,
                        "block_height": block_height,
                        "gas_fee_sat": gas_fee,
                        "raw_data": data
                    }
                }
                print(json.dumps(log), flush=True)
            else:
                print(json.dumps({
                    "level": "WARN", 
                    "message": f"API Error: {response.status_code}"
                }), flush=True)
                
        except Exception as e:
            print(json.dumps({
                "level": "ERROR", 
                "message": f"Monitor Exception: {str(e)}"
            }), flush=True)
        
        # Check every 15 seconds
        time.sleep(15)

if __name__ == "__main__":
    monitor()
