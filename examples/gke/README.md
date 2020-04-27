# gke project

A variant on the `demo-project` example, with an example configuration for GKE with in-cluster building.

Three environments are configured, `gke`, `gke-gcr` and `gke-gcr-kaniko`. All use the same common variables, but the latter two use GCR as a deployment registry (which is often preferable to deploying an in-cluster registry), and `gke-gcr-kaniko` uses Kaniko for builds instead of an in-cluster Docker daemon.

## Setup

### Step 1 - Install the Google Cloud SDK and authenticate

If you haven't already, follow the instructions [here](https://cloud.google.com/sdk/docs/quickstarts) to install the `gcloud` tool, and authenticate with GCP:

```sh
gcloud auth application-default login
```

### Step 2 - Set up a GCP project

Choose a project ID for the demo project and run the following (skip individual steps as appropriate):

```sh
export PROJECT_ID=<id>
# (Skip if you already have a project)
gcloud projects create $PROJECT_ID
# If you haven't already, enable billing for the project (required for the APIs below).
# You need an account ID (of the form 0X0X0X-0X0X0X-0X0X0X) to use for billing.
gcloud alpha billing projects link $PROJECT_ID --billing-account=<account ID>
# Enable the required APIs (this can sometimes take a while).
gcloud services enable compute.googleapis.com container.googleapis.com servicemanagement.googleapis.com --project $PROJECT_ID
```

### Step 3 - Set the variables in the project config

Simply replace the values under the `variables` keys in the `garden.yml` file, as instructed in the comments in the file.

You can optionally set up an ingress controller in the cluster and point a DNS hostname to it, and set that under `variables.default-hostname`.

### Step 4 - Initialize the cluster

Install the cluster-wide services Garden needs by running:

```sh
garden plugins kubernetes cluster-init
```

### Step 5 - Deploy your services

Finally, to build and deploy your services to your new GKE cluster, run:

```sh
# Choose which environment to deploy with the --env parameter
garden deploy --env=<gke|gke-gcr|gke-gcr-kaniko>
```

And that's it!

## Cleanup

Simply delete your GCP project.

```sh
gcloud projects delete $PROJECT_ID
```
