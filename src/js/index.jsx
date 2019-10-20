/*
# Set up 

npm init                    (hit enter a bunch of times. You can change them later in package.json)
npm i --save-dev parcel     (this installs parcel)
npx parcel index.html       (this creates the dist folder, and puts new index.html and new .js and .css files, starts dev web server)
to build
npx parcel build index.html (creates minified js)

*/
import React from "react";
import ReactDOM from "react-dom";
import {TIControl} from "./tiqi-control";
import apiSettings from "./API.json";
import "bootstrap/dist/css/bootstrap.css";


// dynamically load API.json
// this is a little hack which causes webpack to make a new script containing the content of 
//import("./API.json").then(apiSettings => {
const apiDebug = apiSettings.devAPI; //"http://localhost:5020";
const apiProduction = apiSettings.prodAPI; //"http://localhost:5000";
// split apiProduction whereever a :// or : appears, then take everything in between as regexp for testing location.hostname against.
const apiTest = 'localhost';
console.log(location.hostname)
const api = RegExp(apiTest).test(location.hostname) ? apiDebug : apiProduction;
console.log(api)

ReactDOM.render(<TIControl api={api}/>, document.getElementById("root"));
//});
