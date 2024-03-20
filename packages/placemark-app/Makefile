deploy:
    make bundle
    make upload_bundle
    make upload_deploy_script
    make execute_deploy_script

bundle:
    zip -r bundle.zip . -x node_modules/\* -x .git/\* -x .next/\* -x bundle.zip -x .env
upload_bundle:
    scp -i key-pem bundle.zip ec2-user@${HOST}:

upload_deploy_script:
    scp -i key-pem deploy.sh ec2-user@${HOST}:

execute_deploy_script:
    ssh -i key.pem ec2-user@${HOST} "bash deploy.sh"
