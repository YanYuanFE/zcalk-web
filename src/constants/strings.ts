export const SETUP_INSTRUCTIONS = `
git clone https://github.com/cryptonerdcn/zkom_node.git
cd zkom_node
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh -s -- -v 2.8.2
scarb riscv build
cd cairo_server
cargo run
`.trim(); 

export const LANDING_PAGE_TITLE = 
  "A distributed zk computation framework for trustless verifiable calculation.";

export const LANDING_PAGE_DESCRIPTION = 
  "ZKom harnesses a network of distributed prover nodes to generate zero-knowledge proofs for AI computations. By leveraging the Stark and WASM-Cairo, we aim to bring unparalleled efficiency to on-chain verification."; 