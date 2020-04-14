# whatPicture
example react native project for flowers classification. using Oxford flowers 102. 
Complete documentation available in 
https://talmpro.com/2020/04/18/build-react-native-app-with-tensorflow-js-and-mobilenet-part-2

## Perquisites installations

1. NodeJS (https://nodejs.org/en/download/
2. Yarn (https://yarnpkg.com/)
3. expo-cli
        
        npm install -g expo-cli

## Installation

    git clone git@github.com:talma/whatPicture.git
    yarn install

## Run

    expo r

## Using your own model

* In mobilenet/mobilenet.js configure
    1. MODEL_FILE_URL - path to your model json 
    2. class_names.js - model output classes  
