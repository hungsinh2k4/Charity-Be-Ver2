# WSL2 - chạy theo thứ tự:
cd ~/fabric-samples/test-network
./network.sh down && docker volume prune -f
./network.sh up createChannel -c mychannel -ca

cd ~/Charity-Be-ver2
./scripts/deploy-chaincode.sh    # deploy v1.1 (đã fix)
rm -rf wallet/ && node src/modules/blockchain/fabric/wallet-setup.js
cp -r wallet/ /mnt/d/22021184/Charity-Be-ver2/wallet/

# Windows: npm run start:dev
