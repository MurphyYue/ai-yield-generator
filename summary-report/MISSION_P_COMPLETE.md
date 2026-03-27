Mission P: Problems, Solutions & Architect Lessons                                                                           

  ---                                                                                                                          
  Problem 1: Skipped the Official Scaffold
                                                                                                                               
  What happened: I went straight to creating files manually (ponder.config.ts, ponder.schema.ts, etc.) without running pnpm 
  create ponder first.                                                                                                         
  
  What you caught: You stopped me and asked — "did you follow the steps from the official documents?"                          
                  
  How it was fixed: Deleted everything I created, ran pnpm create ponder properly, and let the scaffold generate the correct
  project structure.

  Why this matters as a web3 architect: Official scaffolding tools do more than create files. pnpm create ponder generated the 
  correct tsconfig.json (with resolveJsonModule, moduleResolution: bundler), the right pnpm-lock.yaml, the .env.local pattern,
  and the ponder-env.d.ts type shim. If I had kept my manual files, the project would have had mismatched compiler settings and
   likely failed with cryptic TypeScript errors. The lesson: always let official tooling set up the foundation — it encodes 
  version-specific best practices you can't easily guess from documentation alone.

  ---
  Problem 2: Assumed the API Without Verifying the Installed Version
                                                                                                                               
  What happened: Ponder has changed its API significantly across versions. I initially wrote config using networks, chainId,
  and transport: http(...) — which was the old @ponder/core 0.7.x API. The installed version was ponder 0.16.6, which uses     
  chains, id, and rpc.
                                                                                                                               
  How it was fixed: After the scaffold ran, I read the generated ponder.config.ts template directly and matched its exact      
  pattern (chains.anvil.id, chains.anvil.rpc).
                                                                                                                               
  Why this matters as a web3 architect: Web3 tooling moves fast. Ponder, wagmi, viem, ethers.js — all have breaking API changes
   between major versions. A good architect's habit: read the generated code from the scaffold before writing anything. The
  scaffold always reflects the actual installed version's API. Never trust memory or old blog posts for framework APIs.        
                  
  ---
  Problem 3: Wrong Understanding of the VaultV3.json Structure
                                                                                                                               
  What happened: I assumed the file in /abis/ would be a raw ABI array [...]. The user had copied the full Foundry artifact,
  which is { "abi": [...], "bytecode": "...", ... }.                                                                           
                  
  How it was fixed: Read the first 5 lines of the file with head -5, confirmed the structure had a top-level "abi" key, and    
  used VaultV3Json.abi in the config instead of VaultV3Json directly.
                                                                                                                               
  Why this matters as a web3 architect: There are two distinct things often both called "the ABI":                             
  - Foundry artifact: full JSON with abi, bytecode, deployedBytecode, metadata — output of forge build, lives in out/
  - ABI-only array: just the [...] array — what Etherscan shows, what frontend libs consume directly                           
                                                                                                    
  You will constantly move between these two formats. When something throws "abi is not iterable" or similar, the first thing  
  to check is whether you're passing the full artifact where only the array is expected.                                       
                                                                                                                               
  ---                                                                                                                          
  What to Take Forward as a Web3 Architect
                                          
  1. Indexers follow one universal pattern
  Every indexer — Ponder, The Graph, Envio — maps to the same three-step structure:                                            
  config (what chain + contract to watch)                                                                                      
    → schema (what data shape to store)                                                                                        
      → handler (what to do when an event fires)                                                                               
  Once you internalize this pattern, switching between indexing frameworks is just syntax, not concepts.
                                                                                                                               
  2. The gap between RPC and indexed data is a design decision                                                                 
  Your frontend currently reads balances directly from the chain via useReadContract. That works for current state. But for    
  history — "show me all deposits from the last 30 days" — you cannot do that with RPC calls alone. Ponder solved exactly this:
   it transformed 4 raw chain events into instantly queryable rows. This is the cold data → hot data transformation that every 
  production DeFi protocol relies on.                                                                                          
                  
  3. Always read before you write
  The two fastest ways to get unstuck in any unfamiliar framework:
  - Read what the scaffold generated                                                                                           
  - Read what the actual installed package exports
                                                                                                                               
  Both are faster and more reliable than documentation, which is often written for an older version.
