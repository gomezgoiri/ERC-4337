const {
  concat,
  parseUnits,
  formatEther,
  parseEther,
  getBytes,
  keccak256,
  AbiCoder,
  Wallet
} = require("ethers")

const {
  provider,
  simpleAccountFactory,
  simpleAccount,
  entryPoint,
  paymaster,
  weth9
} = require("./contracts")

const {
  entryPointAddress,
  simpleAccountFactoryAddress,
  verifyingPaymasterAddress,
  wethAddress
} = require("../deployData.json")

const testData = require("../testData.json")

const CHAIN_ID = 1337
const salt = 0 // Date.now()

const MOCK_VALID_UNTIL = "0x00000000deadbeef"
const MOCK_VALID_AFTER = "0x0000000000001234"

async function initAddresses() {
  const { alicePublicKey } = testData

  // Warning: all contracts in Ether have a getAddress() function by default,
  // so we need to specify the one in the smart contract.
  const walletAddress = await simpleAccountFactory.contract[
    "getAddress(address,uint256)"
  ](alicePublicKey, salt)

  return { ...testData, walletAddress }
}

async function composeInitCode(ownerPubKey) {
  const walletCreateABI = simpleAccountFactory.iface.encodeFunctionData(
    "createAccount",
    [ownerPubKey, salt]
  )
  return concat([simpleAccountFactoryAddress, walletCreateABI])
}

async function isAlreadyDeployed(walletAddress) {
  return (await provider.getCode(walletAddress)) !== "0x"
}

async function executeOnChainTransaction(
  ethervalue,
  callData,
  to,
  signPrivateKey
) {
  const wallet = new Wallet(signPrivateKey, provider)
  // const tx = await wallet.populateTransaction(rawTxn)
  // const signedTx = await wallet.signTransaction(tx)
  return wallet.sendTransaction({
    to,
    gas: 396296,
    maxFeePerGas: 44363475285,
    value: parseUnits(ethervalue, "ether"),
    data: callData
  })
}

async function fundContractsAndAddresses(
  pubKey,
  walletAddress,
  privKey,
  coordinatorPrivateKey
) {
  // Transfer 10 ETH to Alice from coordinator
  let tx = await executeOnChainTransaction(
    "10",
    null,
    pubKey,
    coordinatorPrivateKey
  )
  await tx.wait()

  // Convert 0.5 ETH to WETH for Alice
  let rawData = weth9.iface.encodeFunctionData("deposit")
  tx = await executeOnChainTransaction("0.5", rawData, wethAddress, privKey)
  await tx.wait()

  if (!(await isAlreadyDeployed(walletAddress))) {
    // Transfer 2 ETH to aliceSenderWallet
    tx = await executeOnChainTransaction("2", null, walletAddress, privKey)
    await tx.wait()
  }

  // Transfer 0.25 WETH from alice address to aliceSenderWallet
  const wethValue = parseEther("0.25")
  rawData = weth9.iface.encodeFunctionData("transfer", [
    walletAddress,
    wethValue
  ])
  tx = await executeOnChainTransaction("0", rawData, wethAddress, privKey)
  await tx.wait()

  // Transfer 2 ETH to paymaster
  rawData = entryPoint.iface.encodeFunctionData("depositTo", [
    verifyingPaymasterAddress
  ])
  tx = await executeOnChainTransaction("2", rawData, entryPointAddress, privKey)
  await tx.wait()
}

async function composePaymasterAndData(ops, coordinatorPrivateKey) {
  ops.paymasterAndData = concat([
    verifyingPaymasterAddress,
    AbiCoder.defaultAbiCoder().encode(
      ["uint48", "uint48"],
      [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]
    ),
    "0x" + "00".repeat(65)
  ])
  ops.signature = "0x"
  const hash = await paymaster.contract.getHash(
    ops,
    MOCK_VALID_UNTIL,
    MOCK_VALID_AFTER
  )
  const signer = new Wallet(coordinatorPrivateKey, provider)
  const sign = await signer.signMessage(getBytes(hash))
  const paymasterAndData = concat([
    verifyingPaymasterAddress,
    AbiCoder.defaultAbiCoder().encode(
      ["uint48", "uint48"],
      [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]
    ),
    sign
  ])
  return paymasterAndData
}

async function signUserOp(userOp, signer) {
  const packUserOp = AbiCoder.defaultAbiCoder().encode(
    [
      "address",
      "uint256",
      "bytes32",
      "bytes32",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "bytes32"
    ],
    [
      userOp.sender,
      userOp.nonce,
      keccak256(userOp.initCode),
      keccak256(userOp.callData),
      userOp.callGasLimit,
      userOp.verificationGasLimit,
      userOp.preVerificationGas,
      userOp.maxFeePerGas,
      userOp.maxPriorityFeePerGas,
      keccak256(userOp.paymasterAndData)
    ]
  )
  const userOpHash = keccak256(packUserOp)
  const enc = AbiCoder.defaultAbiCoder().encode(
    ["bytes32", "address", "uint256"],
    [userOpHash, entryPointAddress, CHAIN_ID]
  )
  const encKecak = keccak256(enc)
  return signer.signMessage(getBytes(encKecak))
}

async function createUserOp(
  {
    sender,
    initCode,
    callData,
    callGasLimit = 260611,
    gasLimit = 362451,
    verificationGasLimit = 362451,
    preVerificationGas = 53576,
    maxFeePerGas = 29964445250,
    maxPriorityFeePerGas = 100000000,
    paymasterAndData = "0x"
  },
  signer,
  viaPaymaster = false,
  coordinatorPrivateKey
) {
  const userOp = {
    sender,
    nonce: await entryPoint.contract.getNonce(sender, 0),
    initCode,
    callData,
    callGasLimit,
    gasLimit,
    verificationGasLimit,
    preVerificationGas,
    maxFeePerGas,
    maxPriorityFeePerGas,
    paymasterAndData
  }

  if (viaPaymaster) {
    userOp.paymasterAndData = await composePaymasterAndData(
      userOp,
      coordinatorPrivateKey
    )
  }

  userOp.signature = await signUserOp(userOp, signer)

  return userOp
}

async function executeHandleOps(
  walletAddress,
  initCode,
  callData,
  viaPaymaster,
  { walletPrivKey, coordinatorPrivateKey, coordinatorPublicKey }
) {
  if (initCode === null) {
    initCode = "0x"
  }

  if (callData === null) {
    callData = "0x"
  } else {
    callData = simpleAccount.iface.encodeFunctionData("execute", [
      wethAddress,
      0,
      callData
    ])
  }

  const userOpSigner = new Wallet(walletPrivKey, provider)
  const userOp = await createUserOp(
    { sender: walletAddress, initCode, callData },
    userOpSigner,
    viaPaymaster,
    coordinatorPrivateKey
  )

  const handleOpsRawData = entryPoint.iface.encodeFunctionData("handleOps", [
    [userOp],
    coordinatorPublicKey
  ])

  const coordinatorWallet = new Wallet(coordinatorPrivateKey, provider)
  return coordinatorWallet.sendTransaction({
    to: entryPointAddress,
    data: handleOpsRawData
  })
}

async function getUserBalance(username, userPubKey, showWETH = true) {
  const groupLabel = `${username} (${userPubKey})`
  console.group(groupLabel)
  console.log(
    `ETH: ${formatEther(await provider.getBalance(userPubKey), "wei")}`
  )
  if (showWETH) {
    console.log(
      `WETH: ${formatEther(await weth9.contract.balanceOf(userPubKey))}`
    )
  }
  console.groupEnd(groupLabel)
}

async function getBalances(walletAddress) {
  console.group("Balances:")
  console.log(
    `Paymaster ETH ${formatEther(await paymaster.contract.getDeposit())}`
  )
  await getUserBalance("Alice", testData.alicePublicKey)
  await getUserBalance("Alice sender wallet", walletAddress)
  await getUserBalance("Bob", testData.bobPublicKey)
  console.groupEnd("Balances:")
  console.log("\n")

  /*console.log(
    `Bob DAI Balance ${formatEther(await daiContract.balanceOf(bobPublicKey))}`
  )*/
}

async function composeWETHTransferCallData(receiverPubKey, value) {
  const wethValue = parseEther(value)
  return weth9.iface.encodeFunctionData("transfer", [receiverPubKey, wethValue])
}

module.exports = {
  initAddresses,
  isAlreadyDeployed,
  composeInitCode,
  fundContractsAndAddresses,
  executeHandleOps,
  getBalances,
  composeWETHTransferCallData
}
