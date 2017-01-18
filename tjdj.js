// var pigpio = require('pigpio')
// pigpio.initialize();
var config = require('./config');  // gets our username and passwords from the config.js files
var watson = require('watson-developer-cloud');
var Sound = require('node-aplay');
var AudioContext = require('web-audio-api').AudioContext
context = new AudioContext
var _ = require('underscore');
var request = require("request") ;

/************************************************************************
* Step #1: Configuring your Bluemix Credentials
************************************************************************
In this step, the audio sample (pipe) is sent to "Watson Speech to Text" to transcribe.
The service converts the audio to text and saves the returned text in "textStream"
*/

var speech_to_text = watson.speech_to_text({
  username: config.STTUsername,
  password: config.STTPassword,
  version: config.version
});

var fs = require('fs');
var exec = require('child_process').exec;
var text_to_speech = watson.text_to_speech({
  username: config.TTSUsername,
  password: config.TTSPassword,
  version: 'v1'
});


/************************************************************************
* Step #2: Configuring the Microphone
************************************************************************
In this step, we configure your microphone to collect the audio samples as you talk.
See https://www.npmjs.com/package/mic for more information on
microphone input events e.g on error, startcomplete, pause, stopcomplete etc.
*/

var mic = require('mic');
var micInstance = mic({ 'rate': '44100', 'channels': '2', 'debug': false, 'exitOnSilence': 6 });
var micInputStream = micInstance.getAudioStream();

micInputStream.on('data', function(data) {
  //console.log("Recieved Input Stream: " + data.length);
});

micInputStream.on('error', function(err) {
  console.log("Error in Input Stream: " + err);
});

micInputStream.on('silence', function() {
  // detect silence.
});
micInstance.start();
console.log("TJ is listening, you may speak now.");

/************************************************************************
* Step #3: Converting your Speech Commands to Text
************************************************************************
In this step, the audio sample is sent (piped) to "Watson Speech to Text" to transcribe.
The service converts the audio to text and saves the returned text in "textStream"
*/

var recognizeparams = {
  content_type: 'audio/l16; rate=44100; channels=2',
  interim_results: true,
  smart_formatting: true
  //  model: 'en-US_BroadbandModel'  // Specify your language model here
};


textStream = micInputStream.pipe(speech_to_text.createRecognizeStream(recognizeparams));
textStream.setEncoding('utf8');
textStream.on('data', function(str) {
  console.log(' ===== Speech to Text ===== : ' + str); // print each text we receive
  parseText(str);
});

textStream.on('error', function(err) {
  console.log(' === Watson Speech to Text : An Error has occurred ===== \nYou may have exceeded your payload quota.') ; // handle errors
  console.log(err + "\n Press <ctrl>+C to exit.") ;
});


function parseText(str){
  var containsPlay = str.indexOf("play") >= 0  ;
  if (containsPlay){
    str = str.replace("play","");
    str = str.replace("song", "") ;
    console.log(" Command : " , str)
    if (str.length > 10){
      searchSpotify(str);
      setLEDColor("green", 255);
    }
  }else {
    setLEDColor("red")
    setTimeout(function(){
      setLEDColor("white", 255);
    }, 800);
  }
}


/************************************************************************
* Step #4:  Searching Spotify
************************************************************************
In this step, we search spotify using the text we get from the microphone
*/


function searchSpotify(searchterm){
  console.log("searching spotify for " + searchterm + " ....");
  var searchtype = "track"
  var options = {
    method: 'GET',
    url : "https://api.spotify.com/v1/search",
    qs : {
      q:searchterm.replace(/ /g,"+"),
      type : searchtype,
      market :"US",
      limit : 20
    }
  }
  var trackartists = ""
  var maxpopularity = 0 ;
  var selectedtrack ;

  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var result = JSON.parse(body)
      if(result.tracks.items.length > 0) {
        //downloadFile(result.tracks.items[0].preview_url) ; // download preview file
        result.tracks.items.forEach(function(track){

          selectedtrack = track.popularity > maxpopularity ? track : selectedtrack ;
          maxpopularity = track.popularity > maxpopularity ? track.popularity : maxpopularity ;

        })
        //get selected track artists
        selectedtrack.artists.forEach(function(artist){
          trackartists = trackartists + artist.name + ", "
        })
        console.log("Found : " + selectedtrack.name, " by " ,trackartists, selectedtrack.popularity)

        //downloadFile(selectedtrack.preview_url)
      }

    }else{
      console.log(error + " error" + response.statusCode)
    }
  })
}


function downloadFile(url){
  var destinationfile = "preview.mp3"
  var file = fs.createWriteStream(destinationfile);
  var donwloadrequest = request.get(url);

  // verify response code
  donwloadrequest.on('response', function(response) {
    if (response.statusCode !== 200) {
      return cb('Response status was ' + response.statusCode);
    }
  });

  // check for request errors
  donwloadrequest.on('error', function (err) {
    fs.unlink(destinationfile);
  });
  donwloadrequest.pipe(file);
  file.on('finish', function() {
    file.close();
    converttoWav(destinationfile) ;
  });

  file.on('error', function(err) { // Handle errors
    fs.unlink(destinationfile); // Delete the file async. (But we don't check the result)
  });
}

/**
* [converttoWav converts file from Mp3 to wave. Needs to have mpg321 installed]
* @return {[type]} [description]
*/

const spawn = require('child_process').spawn;
function converttoWav(soundfile){
  var destination = "preview.wav"
  console.log("Converting " + soundfile + " to " + destination)
  const ls = spawn('mpg321', ['-w',destination, soundfile, '-g', '50']);

  ls.stdout.on('data', (data) => {
    //console.log(`stdout: ${data}`);
  });

  ls.stderr.on('data', (data) => {
    //console.log(`stderr: ${data}`);
  });

  ls.on('close', (code) => {
    console.log("conversation successful ...")
    playSound("preview.wav")
  });
}

var isplaying = false ;
function playSound(soundfile){
  isplaying = true ;
  pauseMic();
  music = new Sound(soundfile);
  music.play();
  music.on('complete', function () {
    console.log('Done with music playback!');
    isplaying = false;
    resumeMic()
  });
}

function pauseMic(){
  micInstance.pause();
}

function resumeMic(){
  micInstance.resume();
  setLEDColor("white", 255);
}

/************************************************************************
* Step #X: Set LED Color
************************************************************************
Set led color
*/

var ws281x = require('rpi-ws281x-native');
var NUM_LEDS = 1;        // Number of LEDs
ws281x.init(NUM_LEDS);
var color = new Uint32Array(NUM_LEDS);  // array that stores colors for leds

var colorPalette = {
  "red": 0x00ff00,
  "green": 0xff0000,
  "blue": 0x0000ff,
  "purple": 0x008080,
  "yellow": 0xc1ff35,
  "magenta": 0x00ffff,
  "orange": 0xa5ff00,
  "aqua": 0xff00ff,
  "white": 0xffffff
}

setLEDColor("white", 255);

function setLEDColor(randColor, brightness){
  color[0] = colorPalette[randColor];
  ws281x.render(color);
  ws281x.setBrightness(brightness);
}
