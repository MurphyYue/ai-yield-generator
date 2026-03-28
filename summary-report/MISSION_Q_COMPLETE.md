Mission Q: Problems, Solutions & Architect Lessons                                                                           

  ---
  Problem 1: Placeholder API Key Causing Silent Zero Balances
                                                             
  What happened: NEXT_PUBLIC_ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY had the literal string YOUR_KEY. All
   useReadContract calls failed silently — both ETH and USDT balances showed 0. No error was displayed anywhere on the UI.     
  
  How we diagnosed it: Confirmed on-chain data was correct (Etherscan + MetaMask showed real balances), then traced backward to
   the RPC layer. 
                                                                                                                               
  Fix: Replace YOUR_KEY with the real Alchemy API key.

  Architect lesson: This is one of the hardest bug categories in frontend Web3 — silent failures that look like empty data.    
  useReadContract returns undefined or 0n when a call fails, not an exception. The diagnostic method that saved us: verify at 
  every layer independently:                                                                                                   
  1. Is the data on-chain? (Etherscan ✓)
  2. Is the contract address correct? (console.log ✓)                                                                          
  3. Is the network correct? (wagmi log ✓)           
  4. Is the RPC reachable? (found the break here ✗)                                                                            
                                                   
  Always isolate the layer before assuming the bug is in your code.                                                            
                                                                                                                               
  ---                                                                                                                          
  Problem 2: invest() Fails on Sepolia Due to Token Not Listed on Aave                                                         
                                                                      
  What happened: Calling invest(50 USDT) via the frontend gave MetaMask the error:
  transaction gas limit too high (cap: 16,777,216 tx: 21,000,000)                                                              
                                                                 
  Root cause: Our MockERC20 is not a recognized reserve on the real Aave V3 pool. The call chain was:                          
  vault.invest() → strategy.deposit() → try: aavePool.supply(MockERC20)                                                        
                                             ↑ Aave reverts — unlisted token                                                   
                                           catch → returns false                                                               
  vault: require(success) → reverts                                                                                            
  When wagmi estimates gas for a transaction that will revert, it cannot determine actual gas needed and returns the block gas
  limit (~21M). Sepolia caps individual transactions at 16.7M, so MetaMask blocks it before it even reaches the chain.         
                                                                                                                               
  This is expected behavior — not a bug. The try/catch in AaveStrategy is working exactly as designed. The vault correctly
  rejects the invest call rather than losing funds.                                                                            
                  
  Architect lesson: There are two layers of "local vs real" that must both align in testnet deployments:                       
  - Infrastructure layer: contract code deployed on real chain ✓
  - Protocol layer: token must be registered in the external protocol (Aave) ✗                                                 
                                                                              
  MockERC20 works perfectly as a standalone token — deposits, withdrawals, permits all work on Sepolia. But integrating with a 
  real DeFi protocol requires using tokens that protocol recognizes. The gas estimation error is a downstream symptom; the real
   issue is a protocol compatibility mismatch. In production, AaveStrategy would point to real USDC or USDT — tokens Aave      
  already lists.                                                                                                               
                  
  ---
  What to Take Forward as a Web3 Architect
                                                                                                                          
  1. Silent failures are the norm in Web3 frontend                                                                             
  Unlike backend APIs that return error codes, failed contract reads return zero or undefined. Your diagnostic instinct must
  always be: verify on-chain first, then work backward through the stack. Etherscan is your ground truth.                      
                  
  2. Testnet deployment exposes integration boundaries that local mocks hide                                                   
  Anvil with MockAavePool let us test everything in isolation. Sepolia with real Aave revealed that our MockERC20 isn't
  compatible with the real protocol. This is exactly why the deployment progression Anvil → Sepolia → Mainnet exists — each    
  layer exposes a new class of real-world constraints. The strategy pattern and try/catch we built in Mission O meant this
  incompatibility caused a clean revert rather than a fund loss — which is the entire point of that architecture.