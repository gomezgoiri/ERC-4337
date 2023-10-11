require("@nomicfoundation/hardhat-toolbox")

const fs = require("fs")
const { config } = require("dotenv")

config()

const mnemonicFileName =
  process.env.MNEMONIC_FILE ??
  `${process.env.HOME}/.secret/testnet-mnemonic.txt`

let mnemonic = "test ".repeat(11) + "junk"
if (fs.existsSync(mnemonicFileName)) {
  mnemonic = fs.readFileSync(mnemonicFileName, "ascii")
}

module.exports = {
  networks: {
    hardhat: {
      chainId: 1337,
      accounts: { mnemonic }
    },
    local: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
      accounts: { mnemonic }
    }
  },
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: {
          optimizer: { enabled: true, runs: 1000000 }
        }
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: { enabled: true, runs: 1000000 }
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
}
