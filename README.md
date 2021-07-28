# pie-dao-staking-rewards

## Core contracts
 
### [ERC20NonTransferableRewardsOwned.sol](contracts/ERC20NonTransferableRewardsOwned.sol)

Contract keeping tracking of voting/reward weights and handling payout of rewards. ERC20 compatible but transfers are disabled.

### [SharesTimeLock](contracts/SharesTimeLock.sol)

Owner of `ERC20NonTransferableRewardsOwned` and handles the locking and unlocking of `depositToken` and mints/burns `ERC20NonTransferableRewardsOwned` on deposit and withdraw.

## Overview

The `SharesTimeLock` contract allows users to deposit the `depositToken` and lock it to receive `stakedDepositToken`, which represents a share in the total voting and reward weight.

The duration of the lock is limited to 36 months and is at minimum 1 month. The voting and reward weight for each lock time is determined by the `maxRatioArray` in [`SharesTimeLock.sol`]("contracts/SharesTimeLock.sol").

Once locked the `depositToken` cannot be withdrawn early but can be locked again for the max duration by calling: `boostToMax` this extends your lock to the max duration and if the lock is longer than the previous one mints you more `stakedDepositToken`.

If a user's lock expires he should not be entitled anymore to a share of the voting and reward weight. Due to the nature of how smart contracts work this ejection needs to be done actively. Any user can remove an expired `lock` from staking by calling the `eject` function. Other stakers are incentivised to do so to because it gives them a bigger share of the voting and reward weight.

### Forced participation

For users to be able to claim their rewards they need to participate in offchain voting. Participation is tracked ofchain and tracked using a merkle tree, the root of this tree is tracked as `participationMerkleRoot`.

A user can be in the 3 following states:

#### Not included

When an address is not included in the merkle tree it cannot claim rewards

#### Inactive

When an address is included into the tree and its value is set to `0` it has been inactive and the rewards accrued can be redistributed to other stakers by calling `redistribute`.

#### Active

When an address is included into the tree and its value is set to `1` it has been active and the rewards can be claimed by calling ``claim``. Rewards can also be claimed for another address using ``claimFor``

## Scripts

`yarn test`

Runs all tests in `test/`

`yarn coverage`

Runs all tests with solidity-coverage and generates a coverage report.

`yarn compile`

Compiles artifacts into `artifacts/` and generates typechain interfaces in `typechain/`

`yarn lint`

Runs solhint against the contracts.


## Generating participation

A crude implementation of a script which looks at DOUGH holder participation in snapshot and generates a JSON file of participation can be run like so (takes some time):

```
npx hardhat generate-participation --output participation.json --inactive-time 1611824460 --network mainnet
```

## Generating leafs from participation

```
npx hardhat generate-leafs --input participation --output merkleLeafs.json
```

These leafs can be used in applications to generate merkle proofs or compute the root

## Generating merkle root

Will log the merkle root which can be set in the dToken contract to update participation

```
npx hardhat generate-merkle-root --input merkleLeafs.json
```

## Generating merkle proof

If for whatever reason you need to generate a proof outside the UI you can do it through the following command

```
npx hardhat generate-proof --input merkleLeafs.json --output proof.json --address 0x8EDAB1576B34b0BFdcdF4F368eFDE5200ff6F4e8
```


## Integration

### SharesTimeLock

#### Deposit

Users can lock their DOUGH for 6-36 months. They can do so by calling the following function. The amount of tokens deposited needs to be ``approved`` by the caller first.

```solidity
function depositByMonths(uint256 amount, uint256 months, address receiver) external;
```

#### Withdraw

After a lock has expired it can be withdrawn.

```solidity
function withdraw(uint256 lockId) external;
```

#### Boosting to Max

When a user has staked for a shorter duration than 36 months or they want to extend their lock they can do so by boosting it.
This deletes the old lock and generates a new one with a duration of 36 months

```solidity
function boostToMax(uint256 lockId) external;
```

#### Ejecting expired locks

When a lock expired it can be ejected by anyone. Stakers are incentivised to do this to increase their proportional share of the rewards. Ejection can be done in batches:

```solidity
function eject(address[] memory lockAccounts, uint256[] memory lockIds) external;
```

#### Admin functionality

To prevent small locks interfering with the ejections a reasonable min lock should be set. This can be upgraded by the ``owner``

```solidity
function setMinLockAmount(uint256 minLockAmount_) external;
```

Only whitelisted contracts can lock tokens or deposit to an address other than themselves. To whitelist an address from the ``owner``

```solidity
function setWhitelisted(address user, bool isWhitelisted) external;
```


#### Getters

Get all staking data for an address


```solidity
function getStakingData(address account) external view returns (StakingData memory data);

// StakingData data structure
struct StakingData {
    uint256 totalStaked; // total amount of DOUGH staked
    uint256 veTokenTotalSupply; // total amount of veDOUGH
    uint256 accountVeTokenBalance; // account veDOUGH balance
    uint256 accountWithdrawableRewards; // amount of RWRD an account can withdraw (not taking into consideration participation)
    uint256 accountWithdrawnRewards; // amount of RWRD withdrawn by this address
    uint256 accountDepositTokenBalance; // DOUGH balance of account
    uint256 accountDepositTokenAllowance; // DOUGH approved to SharesTimeLock contract
    Lock[] accountLocks; // Locks of an account
}

// Lock data structure
struct Lock {
    uint256 amount; // amount locked
    uint32 lockedAt; // timestamp when tokens were locked
    uint32 lockDuration; // duration of lock
}
```

If a lock can be ejected or not

```solidity
function canEject(address account, uint256 lockId) public view returns(bool);
```
