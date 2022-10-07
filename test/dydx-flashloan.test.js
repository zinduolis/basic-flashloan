const BN = require("bn.js")
const { legos } = require("@studydefi/money-legos")
const { sendEther, pow } = require("./util")
const { DAI, DAI_WHALE, USDC, USDC_WHALE, USDT, USDT_WHALE } = require("./config")

const IERC20 = artifacts.require("IERC20")
const TestDyDxSoloMargin = artifacts.require("TestDyDxSoloMargin")

const SOLO = "0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e"

contract("TestDyDxSoloMargin", (accounts) => {
//   const WHALE = USDC_WHALE
  const TOKEN = DAI
  const DECIMALS = 6
  const FUND_AMOUNT = pow(10, DECIMALS).mul(new BN(2000000))
  const BORROW_AMOUNT = pow(10, DECIMALS).mul(new BN(1000000))

  let testDyDxSoloMargin
  let token

  let dai, uniswap, daiSwap, daiSwapAddress

  before(async () => {
    console.log("Initiating contract instance")
    testDyDxSoloMargin = await TestDyDxSoloMargin.new()
    const accBal = await web3.eth.getBalance(accounts[0])
    console.log("Balance of accounts[0] is: ", Number(web3.utils.fromWei(accBal, 'ether')), " ETH")
    console.log("Deployed contract address: ", testDyDxSoloMargin.address.toString())

    dai = new web3.eth.Contract(legos.erc20.dai.abi, legos.erc20.dai.address)
    uniswap = new web3.eth.Contract(legos.uniswap.factory.abi, legos.uniswap.factory.address)
    daiSwapAddress = await uniswap.methods.getExchange(legos.erc20.dai.address).call()
    daiSwap = new web3.eth.Contract(legos.uniswap.exchange.abi, daiSwapAddress)
  })

  it("Contract can be funded", async () => {
    
    await testDyDxSoloMargin.sendTransaction({value: '1000000000000000000'})
    const contrBal = await web3.eth.getBalance(testDyDxSoloMargin.address)
    const etherValue = Number(web3.utils.fromWei(contrBal, 'ether'))
    console.log("Deployed contract address inside IT: ", testDyDxSoloMargin.address.toString())
    console.log("Contract balance after the top up is: ", etherValue, " ETH")
    assert.isAbove(etherValue, 0, "Contract wasn't topped up")
  })

  it("Buy some DAI coins", async () => {
    token = await IERC20.at(TOKEN)
    //swap 1 ETH=>DAI
    await daiSwap.methods.ethToTokenSwapInput(1, 2525644800).send({ from: accounts[0], value: web3.utils.toWei('1', 'Ether') })
    //send DAI to the contract
    await dai.methods.transfer(testDyDxSoloMargin.address, web3.utils.toWei('1', 'ether')).send({ from: accounts[0] })
    //Check contract's balance of DAI
    const daiBal = await token.balanceOf(testDyDxSoloMargin.address)
    console.log("Contract has: %s DAI", daiBal.toString())

  })


  it("Flash loan successfully executed", async () => {
    const tx = await testDyDxSoloMargin.initiateFlashLoan(TOKEN, 10000)
    console.log(`${await testDyDxSoloMargin.flashUser()}`)

    for (const log of tx.logs) {
      console.log(log.args.message, log.args.val.toString())
    }
  })
})



//   beforeEach(async () => {
//     token = await IERC20.at(TOKEN)
//     testDyDxSoloMargin = await TestDyDxSoloMargin.new()

//     await sendEther(web3, accounts[0], WHALE, 1)

//     // send enough token to cover fee
//     const bal = await token.balanceOf(WHALE)
//     const accBalance = await token.balanceOf(accounts[0])
//     console.log("Balance of whale : ", bal.toString())
//     console.log("Balance of account 0: ", accBalance.toString())
//     assert(bal.gte(FUND_AMOUNT), "balance < fund")
//     await token.transfer(testDyDxSoloMargin.address, FUND_AMOUNT, {
//       from: WHALE,
//     })

//     const soloBal = await token.balanceOf(SOLO)
//     console.log(`solo balance: ${soloBal}`)
//     assert(soloBal.gte(BORROW_AMOUNT), "solo < borrow")
//   })

//   it("flash loan", async () => {
//     const tx = await testDyDxSoloMargin.initiateFlashLoan(token.address, BORROW_AMOUNT, {
//       from: WHALE,
//     })

//     console.log(`${await testDyDxSoloMargin.flashUser()}`)

//     for (const log of tx.logs) {
//       console.log(log.args.message, log.args.val.toString())
//     }
//   })
// })