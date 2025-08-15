#!/bin/sh

# This script checks for a connection to the Localstack container,
# waiting up to 10 seconds, then runs the Terraform init, plan, apply commands.

run_terraform() {
    terraform init
    terraform plan
    terraform apply -auto-approve
}

TIMEOUT=10
while :; do
    # Test the connection to Localstack
    nc -z $LOCALSTACK_HOST $LOCALSTACK_PORT > /dev/null 2>&1
    if [ $? -eq  0 ] ; then
        # If `nc` was successful, run terraform and then exit.
        run_terraform
        exit 0
    fi

    # Otherwise, check the timeout countdown
    if [ "$TIMEOUT" -le 0 ]; then
        break
    fi

    # Decrement the timeout and sleep for a second, then try again
    TIMEOUT=$((TIMEOUT - 1))
    sleep 1
    echo "Waiting for service..."
done

echo "Unable to connect to Localstack"
exit 1
