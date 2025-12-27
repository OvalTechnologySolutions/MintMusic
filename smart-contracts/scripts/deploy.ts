import { ethers } from "hardhat";

async function main() {
  const MintMusic = await ethers.getContractFactory("MintMusic");
  const mintMusic = await MintMusic.deploy();

  await mintMusic.waitForDeployment();

  console.log("MintMusic deployed to:", await mintMusic.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

