source ~/.nvm/nvm. sh
source ~/.profile
timestamp=$(date +"%Y-%m-%d-%H-%M-%S")
mkdir -p deployments/$timestamp
ср bundle.zip deployments/$timestamp
cd deployments/$timestamp
unzip bundle.zip
npm install
npm run build pm2 del app
pm2 start 'npm start' --name app
