# Abstract accounts tests

Main differences with the original project:

- Added _package.json_
  - Including all dependencies
  - Including all scripts
- ~~Truffle~~ => Hardhat
- ~~Web3~~ => Ethers
- Assuming a _Hardhat node_ is run locally without any Mainnet fork. All the contracts used (WETH) are added to the project and deployed locally.

## Setup

```bash
npm i
npm run compile
```

Create a `testData.json` file with the following content:

```json
{
  "coordinatorPublicKey": "<address1>",
  "coordinatorPrivateKey": "<privateKeyForAddr1>",

  "alicePublicKey": "<address2>",
  "alicePrivateKey": "<privateKeyForAddr2>",

  "bobPublicKey": "<address3>",
  "bobPrivateKey": "<privateKeyForAddr2>"
}
```

### Run network

```bash
npm run test-network
```

### Deploying contracts

```bash
npm run deploy
```

### Sample code

- [Create wallet contract](https://medium.com/cumberlandlabs/building-account-abstraction-erc-4337-part-1-create-wallet-contract-initcode-82024f9c0ec1): `npm run create-wallet-contract`
- [Execute callData](https://medium.com/cumberlandlabs/building-account-abstraction-erc-4337-part-2-execute-calldata-8a22a470a5ac): `npm run execute-callData`
- [Execute callData via paymaster](https://medium.com/cumberlandlabs/building-account-abstraction-erc-4337-part-3-paymaster-39405f6e06ef): `npm run execute-callData-paymaster` and `npm run create-wallet-contract-paymaster`
