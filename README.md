# Official Map Data
This repository contains the official map data for D&D Beyond. This data is used to populate the map browser in the D&D Beyond Map System. The data is stored in json files in the sources directory. The json files are then used to generate the official-map-data.json file which is used to update the official maps for the 2d map system.


## Requirements
- Node 18.16.0 or higher
- Optional: nvm (node version manager)

## Lorekeepers Workflow
* Generally LK will not need to edit most of this repository.
* The sources folder contains json files that each represent a source. The sources are compiled into a single json file. LK will need to run the `npm run generate-map-data` command after adding or editing sources.
* **The official-map-data.json file should not be edited directly**.
* LK can push the changes to github and create a PR. this will trigger the unit test and validate the map data and schema.
* Once the PR is merged, the staging workflow will run and send the data to staging.
* Once the changes are in a release the data will be sent to production.

# Token Scalers
* STG Bucket (must be connected to VPN): https://stg.dndbeyond.com/games/admin/token-scaler
* Prod Bucket: https://dndbeyond.com/games/admin/token-scaler

# OMD Viewer
OMD Viewer is an admin tool that allows LK to view the official map data to validate the data, release state, and entitlements. This tool requires that you login to DDB before accessing the tool.
* STG (must be connected to VPN): https://stg.dndbeyond.com/games/admin/omd-viewer
* Prod: https://dndbeyond.com/games/admin/omd-viewer

**If you use the token scaler, make sure the image you're scaling is in that environment's S3 Bucket!**

## Developer Setup
1. Clone the repository
2. Install dependencies
```bash
npm install
```
3. Add or Edit the json files in the sources directory
4. Run `npm run generate-map-data` to generate the official-map-data.json file
5. Run the unit tests to validate changes

## Generating the schema
The schema is generated from the json files in the src directory based on the types.ts file. To generate the schema, run the following command:
```bash
npm run generate-schema
```

## Generating the official map data
The official-map-data.json file is generated from the json files in the sources directory. To generate the json file, run the following command:
```bash
npm run generate-map-data
```
Note: Any manual edits to the official-map-data.json will get overwritten by this command.

## Validating JSON
To validate the JSON, run the included unit test suite.
```bash
npm test
```

## Image Requirements
All images must be in the feywild S3 bucket (typically: h7ktnb-dndbeyond-feywild-maps-{env}) and be prefixed with `official/maps/`. The s3 key for the image must be included in the json. Do not include the full url, just the key.

The S3 Key is the Prefix and the filename as a whole, ie: `official/maps/map-3.02-battle-of-high-hill.png`

## JSON Format
The json format for a source file:
```js
{
  "type": "sourcebook", // sourcebook | adventure | basic | mappack
  "name": "PHB", // Short Name/Initials of source
  "description": "Player's Handbook", // Full Name of Source
  "backgroundImageKey": "official/maps/filename.png", // Background Image for Source in map browser
  "chapters": [{ // Must have at least one chapter
    "id": "1", // Chapter ID is arbitrary
    "name": "Chapter 1", // Chapter Name
    "order": 1,
    "maps": [
      { // Must have at least one map
        "name": "Example Name", //Whatever the name of the map is (reference the book)
        "description": "Example Description", //Typically used to denote whether something is a DM/Player Map. Can be left blank.
        "order": 1,
        "thumbnailKey": "official/maps/filename.png", // Thumbnail for map in map browser
        "imageKey": "official/maps/filename.png", // Actual Map Image from S3
        "videoKey": "official/maps/filename.webm", // Optional Map Video from S3
        "tokenScale": 1 // Token Scale for map
      }
    ]
  }]
}
```

## Running Quick Play Maps Publishing Locally
To run the quick play maps publishing process locally for testing purposes:

1. **Setup Environment Variables**: Create a `.env` file in the root directory with the following variables:
```bash
# only set this for development
# for testing saving prepared maps in local development
NODE_TLS_REJECT_UNAUTHORIZED=0
API_URL_LIVE=https://dev.dndbeyond.com:3000/games/api
API_URL_STG=https://stg.dndbeyond.com/games/api
BEARER_TOKEN_LIVE=your_local_dev_jwt_token
BEARER_TOKEN_STG=your_staging_jwt_token
```

2. **Run feywild app**: Before running the script, ensure you are running locally the feywild repo.
This process will attempt to publish the quick play maps from staging to your local development environment.


3. **Run the script**: For debugging purposes, you can run the script with the Node.js debugger:

```bash
npm run dev:publish-quick-play-maps
```


## Deploying
This repo has two workflows that handle deploying the json.

### Deploying to Staging
The staging workflow runs on every push to the `main` branch. It will send the json to staging using an api request.

### Deploying to Production
The production workflow runs when a release is created on github. It will send the json to production using an api request.
Before creating a release it is a good idea to adjust the version in the package.json file to match the intended release version.

### Quick Play Maps Publishing via GitHub Actions
The Quick Play Maps can be published using the GitHub Actions workflow:
1. **Manual Deployment**: Navigate to the Actions tab in the GitHub repository
2. **Select Workflow**: Choose "Publish Quick Play Maps" from the workflow list
3. **Trigger Workflow**: Click "Run workflow" button to manually trigger the deployment
4. **Monitor Progress**: The workflow will:
   - Run tests to validate the quick play maps
   - Generate JWT tokens for both staging and live environment
   - Publish the maps from staging to live environment

### Releasing Sources
The release state of sources is controlled by LaunchDarkly. The `release-gate.2d-maps-official-sources` flag is a json flag that contains a list of sources that are released. The variations can be found here: [Release Gate: 2D Maps Official Sources: Variations](https://app.launchdarkly.com/default/development/features/release-gate.2d-maps-official-sources/variations). To release a source, add the source name to the list in the flag with a value of true. To remove a source from the release, remove the source name from the list in the flag or set its value to false.

There are 3 main variations in the flag: development, staging, and live. Each LD environment has been set to target the appropriate flag variation. Changing a variation will change that variation for all environments. Any number of additional variations can be added in LaunchDarkly and targeted to specific users or groups.

#### Source List
As part of the PR action on github a list of sources is generated and added to any PR that adds new sources. This list is a reference for the LD flags that can be used to update the Release array. This list is only for reference and does not need to be edited for any release. Look for source-list.json in the root of the project.

#### Anatomy of LD Release Gate Flag
```
{
  "env": "production", // used to enforce uniqueness of the variation
  "released": { // list of sources that are released
    "BoOK": true // books are added here using the source abbreviation and a boolean value
  },
  "showUnreleased": false, // controls whether unreleased sources are shown in the map browser
  "skipEntitlements": false // controls whether entitlements are checked when viewing maps
}
```
#### Understanding Variations and Targeting
Any number of variations can be created in LD. Each variation can be targeted to specific users or groups. In addition to the 3 main variations, you can create variations to be targeted by specific users or segments to create unique sets of released content. For example, marketing segment variation could contains a set of sources that are in a marketing push, like a new book to be released. This variation could be targeted to the marketing team to allow them to view the maps for the new book before it is released.

This variation would only show the sources required for the marketing content limiting chances of accidental leaks. Once the variation is configured it can be targeted to the marketing team. The marketing team will then be able to view the maps for the new book without entitlements. Additionally they will only see the released books in the variation example below.

Example marketing variation:
```
{
  "env": "marketing Cos",
  "released": {
    "CoS": true, // Curse of Strahd
    "CoSEE": true, // Curse of Strahd Expanded Edition (not real, just an example)
  },
  "showUnreleased": false,
  "skipEntitlements": true // This is set to true to allow the marketing team to view the maps without entitlements
}
```
