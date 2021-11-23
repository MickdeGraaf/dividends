import { task } from "hardhat/config"
import { ERC20NonTransferableRewardsOwned } from "../typechain/ERC20NonTransferableRewardsOwned"
import { ERC20NonTransferableRewardsOwned__factory } from "../typechain/factories/ERC20NonTransferableRewardsOwned__factory"
import { TestERC20__factory } from "../typechain/factories/TestERC20__factory"
import { SharesTimeLock__factory } from "../typechain/factories/SharesTimeLock__factory"
import { TestSharesTimeLock__factory } from "../typechain/factories/TestSharesTimeLock__factory"
import { PProxy__factory } from "../typechain/factories/PProxy__factory"
import { MerkleDistributor__factory } from "../typechain/factories/MerkleDistributor__factory"
import { parseEther } from "ethers/lib/utils"

task("deploy-staking")
  .addParam("depositToken")
  .addParam("rewardToken")
  .addParam("name")
  .addParam("symbol")
  .addParam("minLockDuration")
  .addParam("maxLockDuration")
  .addParam("minLockAmount")
  .setAction(async (taskArgs, { ethers, network }) => {
    const signer = (await ethers.getSigners())[0]

    const dToken = await new ERC20NonTransferableRewardsOwned__factory(signer).deploy()
    await dToken["initialize(address)"](taskArgs.rewardToken)
    await dToken["initialize(string,string)"](taskArgs.name, taskArgs.symbol)

    console.log(`dToken deployed at: ${dToken.address}`)

    const sharesTimeLock = await new SharesTimeLock__factory(signer).deploy()
    await sharesTimeLock.initialize(
      taskArgs.depositToken,
      dToken.address,
      taskArgs.minLockDuration,
      taskArgs.maxLockDuration,
      taskArgs.minLockAmount
    )

    console.log(`sharesTimeLock deployed at: ${sharesTimeLock.address}`)

    const tx = await dToken.transferOwnership(sharesTimeLock.address)
    console.log(`dToken ownership transfered at ${tx.hash}`)

    console.log(
      `To verify dToken run: npx hardhat verify ${dToken.address} ${taskArgs.rewardToken} ${taskArgs.name} ${taskArgs.symbol} --network ${network.name}`
    )
    console.log(
      `To verify sharesTimeLock run: npx hardhat verify ${sharesTimeLock.address} ${taskArgs.depositToken} ${dToken.address} ${taskArgs.minLockDuration} ${taskArgs.maxLockDuration} ${taskArgs.minLockAmount} --network ${network.name}`
    )
  })

task("deploy-staking-proxied")
  .addParam("depositToken", "token being staked")
  .addParam("rewardToken", "token being paid as reward")
  .addParam("name", "name of the rewards shares")
  .addParam("symbol", "symbol of the rewards shares")
  .addParam("minLockDuration")
  .addParam("maxLockDuration")
  .addParam("minLockAmount")
  .setAction(async (taskArgs, { ethers, network }) => {
    const signer = (await ethers.getSigners())[0]

    const contracts = []

    // deploy implementations
    const dTokenImp = await new ERC20NonTransferableRewardsOwned__factory(signer).deploy()
    contracts.push({ name: "dTokenImp", address: dTokenImp.address })
    const timeLockImp = await new SharesTimeLock__factory(signer).deploy()
    contracts.push({ name: "timeLockImp", address: timeLockImp.address })

    // deploy proxies
    const proxyFactory = new PProxy__factory(signer)
    const dTokenProxy = await proxyFactory.deploy()
    contracts.push({ name: "dTokenProxy", address: dTokenProxy.address })
    const timeLockProxy = await proxyFactory.deploy()
    contracts.push({ name: "timeLockProxy", address: timeLockProxy.address })

    await dTokenProxy.setImplementation(dTokenImp.address)
    await timeLockProxy.setImplementation(timeLockImp.address)

    const dToken = ERC20NonTransferableRewardsOwned__factory.connect(dTokenProxy.address, signer)
    const timeLock = SharesTimeLock__factory.connect(timeLockProxy.address, signer)

    // initialize contracts
    await dToken["initialize(string,string,address,address)"](
      taskArgs.name,
      taskArgs.symbol,
      taskArgs.rewardToken,
      signer.address
    )
    await timeLock["initialize(address,address,uint32,uint32,uint256)"](
      taskArgs.depositToken,
      dToken.address,
      taskArgs.minLockDuration,
      taskArgs.maxLockDuration,
      taskArgs.minLockAmount
    )

    console.table(contracts)
    console.log("done")
  })

task("deploy-staking-proxied-testing")
  .addParam("depositToken", "token being staked")
  .addParam("rewardToken", "token being paid as reward", undefined, undefined, true)
  .addParam("name", "name of the rewards shares")
  .addParam("symbol", "symbol of the rewards shares")
  .addParam("minLockDuration")
  .addParam("maxLockDuration")
  .addParam("minLockAmount")
  .addParam("secondsPerMonth")
  .setAction(async (taskArgs, { ethers, network }) => {
    const signer = (await ethers.getSigners())[0]

    const contracts = []

    //If reward token is not defined deploy a testing tokken
    if (!taskArgs.rewardToken) {
      const token = await new TestERC20__factory(signer).deploy("RWRD", "RWRD")
      await token.mint(signer.address, parseEther("1000000"))
      contracts.push({ name: "rewardToken", address: token.address })
      taskArgs.rewardToken = token.address
      console.log("rewardToken deployed")
    }

    // deploy implementations
    const dTokenImp = await new ERC20NonTransferableRewardsOwned__factory(signer).deploy()
    contracts.push({ name: "dTokenImp", address: dTokenImp.address })
    console.log("dTokenImp deployed")
    const timeLockImp = await new TestSharesTimeLock__factory(signer).deploy()
    contracts.push({ name: "timeLockImp", address: timeLockImp.address })
    console.log("timeLockImp deployed")

    // deploy proxies
    const proxyFactory = new PProxy__factory(signer)
    const dTokenProxy = await proxyFactory.deploy()
    contracts.push({ name: "dTokenProxy", address: dTokenProxy.address })
    const timeLockProxy = await proxyFactory.deploy()
    contracts.push({ name: "timeLockProxy", address: timeLockProxy.address })

    await dTokenProxy.setImplementation(dTokenImp.address)
    await timeLockProxy.setImplementation(timeLockImp.address)

    const dToken = ERC20NonTransferableRewardsOwned__factory.connect(dTokenProxy.address, signer)
    const timeLock = TestSharesTimeLock__factory.connect(timeLockProxy.address, signer)

    // initialize contracts
    await dToken["initialize(string,string,address,address)"](
      taskArgs.name,
      taskArgs.symbol,
      taskArgs.rewardToken,
      signer.address,
      { gasLimit: 1000000 }
    )
    await timeLock["initialize(address,address,uint32,uint32,uint256)"](
      taskArgs.depositToken,
      dToken.address,
      taskArgs.minLockDuration,
      taskArgs.maxLockDuration,
      taskArgs.minLockAmount,
      { gasLimit: 1000000 }
    )

    console.log("Set seconds per month")
    // await timeLock.setSecondsPerMonth(taskArgs.secondsPerMonth);
    await timeLock.setSecondsPerMonth(taskArgs.secondsPerMonth, { gasLimit: 1000000 })

    // console.log("fetching depositToken");
    // const depositToken = await timeLock.depositToken();
    // console.log(depositToken);

    console.log("transfering ownership of dToken")
    await dToken.transferOwnership(timeLock.address, { gasLimit: 1000000 })

    // console.log("getting staking data");
    // const data = await timeLock.getStakingData(signer.address);
    // console.log(data);

    console.table(contracts)
    console.log("done")
  })

task("deploy-d-token-implementation", async (taskArgs, { ethers }) => {
  const signer = (await ethers.getSigners())[0]

  console.log(`Deploying from: ${signer.address}`)

  const contracts: any[] = []

  const dTokenImp = await new ERC20NonTransferableRewardsOwned__factory(signer).deploy()
  contracts.push({ name: "dTokenImp", address: dTokenImp.address })

  console.table(contracts)
})

task("deploy-timelock-implementation", async (taskArgs, { ethers }) => {
  const signer = (await ethers.getSigners())[0]

  console.log(`Deploying from: ${signer.address}`)

  const contracts: any[] = []

  const timeLockImp = await new TestSharesTimeLock__factory(signer).deploy()
  contracts.push({ name: "timeLockImp", address: timeLockImp.address })
  console.log("timeLockImp deployed")

  console.table(contracts)
})

task("deploy-merkle-distributor-proxied", async (_, { ethers }) => {
  const signer = (await ethers.getSigners())[0]

  console.log(`Deploying from: ${signer.address}`)

  const contracts: any[] = []

  const proxyFactory = new PProxy__factory(signer)
  const merkleDistributorProxy = await proxyFactory.deploy()
  contracts.push({ name: "merkleDistributorProxy", address: merkleDistributorProxy.address })

  const merkleDistributorImpl = await new MerkleDistributor__factory(signer).deploy()
  contracts.push({ name: "merkleDistributorImpl", address: merkleDistributorImpl.address });

  await merkleDistributorProxy.setImplementation(merkleDistributorImpl.address);

  const merkleDistributor = MerkleDistributor__factory.connect(merkleDistributorProxy.address, signer);
  await merkleDistributor.initialize();

  
//   await merkleDistributor.setWindow("1349999999999999999999905", "0x1083D743A1E53805a95249fEf7310D75029f7Cd6", "0xc42cf6686eee2a02889fdbe13f2dbc23a2273c9b68d78e117652831deeeda3dd", "");

//   console.log(await merkleDistributor["merkleWindows(uint256)"](0))

//   console.log(
//     await merkleDistributor["claim((uint256,uint256,uint256,address,bytes32[]))"]({
//       windowIndex: 0,
//       amount: ethers.BigNumber.from("2552138816155465491830"),
//       accountIndex: 0,
//       account: "0x0056D1fd2ca3c0F3A7B6ed6CDd1F1F104B4BF9A9",
//       merkleProof: [
//         "0xc42f013a41b2f34590406797ecddcb2bf3c43f03f7bcd46079b1ab4611c48bea",
//         "0x8bbb613f107de16cdd25b2bf33b0b1e68b1473ccbd49f4bc3708b0e4b6aa7dc7",
//         "0x24d26d37cd091aeacb075a20d5f3d5b0e47473cefac62413236c28161431791b",
//         "0x0a20ad8a76b66321aa0bec37eabc7dedac87db050e607902450eaa90b0a24c80",
//         "0xe508c53668febdc4bdac06451cfbd1fc08c73cbf3272f99640de9184909309ce",
//         "0xaf8dc0efcc1afe59152d3ad0fe88b9736be271f9fdf2fe6cc9d5a3d978d37f5c",
//         "0x2e15bb6a66b341bf4e495852d137b22e55ed2c5ecc2c2593e381d0fa982c8cb9",
//         "0x7403f1de3f14aaafeab5f734a4d74ddfa18709925d6a8c8276b9486f6baf9999",
//       ],
//     })
//   )

  console.log("MerkleDistributor deployed!")

  await merkleDistributor.transferOwnership("0x6458A23B020f489651f2777Bd849ddEd34DfCcd2");

  console.table(contracts)
})
