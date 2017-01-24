var pigpio = require('pigpio')
pigpio.initialize();

var config = require('./config'); // gets our username and passwords from the config.js files
//var watson = require('watson-developer-cloud');
var stt = require('watson-developer-cloud/speech-to-text/v1'); // set up watson speech to text
var tts = require('watson-developer-cloud/text-to-speech/v1'); // set up watson text to speech
var Sound = require('node-aplay');
var AudioContext = require('web-audio-api').AudioContext
context = new AudioContext
var _ = require('underscore');
var request = require("request");

/************************************************************************
* Step #1: Configuring your Bluemix Credentials
************************************************************************
In this step, the audio sample (pipe) is sent to "Watson Speech to Text" to transcribe.
The service converts the audio to text and saves the returned text in "textStream"
*/


var fs = require('fs');
var exec = require('child_process').exec;

var text_to_speech = new tts({
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
var micInstance = mic({
    'rate': '44100',
    'channels': '2',
    'debug': false,
    'exitOnSilence': 6
});
var micInputStream;


/************************************************************************
* Step #3: Converting your Speech Commands to Text
************************************************************************
In this step, the audio sample is sent (piped) to "Watson Speech to Text" to transcribe.
The service converts the audio to text and saves the returned text in "textStream"
*/


pipeStream();

function pipeStream() {
    micInputStream = micInstance.getAudioStream();

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

    var speech_to_text = new stt({
        username: config.STTUsername,
        password: config.STTPassword,
        version: config.version
    });

    var recognizeparams = {
        content_type: 'audio/l16; rate=44100; channels=2',
        interim_results: true,
        smart_formatting: true
        //  model: 'en-US_BroadbandModel'  // Specify your language model here
    };

    textStream = micInputStream.pipe(speech_to_text.createRecognizeStream(recognizeparams));
    textStream.setEncoding('utf8');
}

textStream.on('data', function(str) {
    console.log(' ===== Speech to Text ===== : ' + str); // print each text we receive
    parseText(str);
});

textStream.on('error', function(err) {
    console.log(' === Watson Speech to Text : An Error has occurred ===== \n'); // handle errors
    console.log(err);
    var reconnectinterval = 3000;
    console.log(err + "Attempting to reconnect .. in " + reconnectinterval / 1000 + " seconds");
    micInstance.stop();
    setTimeout(function() {

        pipeStream();
    }, reconnectinterval);

});


function parseText(str) {
    var containsPlay = str.indexOf("play") >= 0;
    if (containsPlay) {
        str = str.replace("play", "");
        str = str.replace("song", "");
        console.log(" Command : ", str)
        if (str.length > 10) {
            searchSpotify(str);
            setLEDColor("green", 255);
        }
    } else {
        setLEDColor("red", 255)
        setTimeout(function() {
            setLEDColor("white", 255);
        }, 800);
    }
}


/************************************************************************
* Step #4:  Searching Spotify
************************************************************************
In this step, we search spotify using the text we get from the microphone
*/


function searchSpotify(searchterm) {
    console.log("searching spotify for " + searchterm + " ....");
    var searchtype = "track"
    var options = {
        method: 'GET',
        url: "https://api.spotify.com/v1/search",
        qs: {
            q: searchterm.replace(/ /g, "+"),
            type: searchtype,
            market: "US",
            limit: 20
        }
    }
    var trackartists = ""
    var maxpopularity = 0;
    var selectedtrack;

    request(options, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body)
            if (result.tracks.items.length > 0) {
                //downloadFile(result.tracks.items[0].preview_url) ; // download preview file
                selectedtrack = result.tracks.items[0];
                result.tracks.items.forEach(function(track) {

                    selectedtrack = track.popularity > maxpopularity ? track : selectedtrack;
                    maxpopularity = track.popularity > maxpopularity ? track.popularity : maxpopularity;

                })
                //get selected track artists
                if (selectedtrack !== undefined) {
                    selectedtrack.artists.forEach(function(artist) {
                        trackartists = trackartists + artist.name + ", "
                    })
                    console.log("Found : " + selectedtrack.name, " by ", trackartists, selectedtrack.popularity)
                    downloadFile(selectedtrack.preview_url)
                    pauseMic();
                }



            } else {
                console.log("no song found from spotify")
                setLEDColor("red", 255)
                setTimeout(function() {
                    setLEDColor("white", 255);
                }, 800);
            }

        } else {
            console.log(error + " error" + response.statusCode)
        }
    })
}


function downloadFile(url) {
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
    donwloadrequest.on('error', function(err) {
        fs.unlink(destinationfile);
    });
    donwloadrequest.pipe(file);
    file.on('finish', function() {
        file.close();
        dance(destinationfile);
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

function converttoWav(soundfile) {
    var destination = "preview.wav"
    console.log("Converting " + soundfile + " to " + destination)
    const ls = spawn('mpg321', ['-w', destination, soundfile, '-g', '50']);

    ls.stdout.on('data', (data) => {
        //console.log(`stdout: ${data}`);
    });

    ls.stderr.on('data', (data) => {
        //console.log(`stderr: ${data}`);
    });

    ls.on('close', (code) => {
        console.log("conversation successful ...")
        dance(soundfile)
    });
}

var isplaying = false;

function playsound(soundfile) {
    isplaying = true;
    pauseMic();
    // music = new Sound(soundfile);
    // music.play();
    // music.on('complete', function() {
    //     console.log('Done with music playback!');
    //     isplaying = false;
    //     resumeMic()
    // });

    var destination = "preview.wav"
    console.log("Playing soundfile " + soundfile)
    const ls = spawn('mpg321', [soundfile, '-g', '50']);

    ls.on('close', (code) => {
        console.log('Done with music playback!');
        isplaying = false;
        resumeMic()
    });
}

function pauseMic() {
    micInstance.pause();
}

function resumeMic() {
    micInstance.resume();
    setLEDColor("white", 255);
}

/************************************************************************
* Step #X: Set LED Color
************************************************************************
Set led color
*/

var ws281x = require('rpi-ws281x-native');
var NUM_LEDS = 1; // Number of LEDs
ws281x.init(NUM_LEDS);
var color = new Uint32Array(NUM_LEDS); // array that stores colors for leds

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

function setLEDColor(randColor, brightness) {
    color[0] = colorPalette[randColor];
    ws281x.render(color);
    ws281x.setBrightness(brightness);
}

/*********************************************************************
 * Piece #7: Play a Song and dance to the rythm!
 *********************************************************************
 */
var pcmdata = [];
var samplerate;
var soundfile = "sounds/club.wav"
var threshodld = 0;
//decodeSoundFile(soundfile);
function decodeSoundFile(soundfile) {
    console.log("decoding sound file ", soundfile, " ..... ")
    fs.readFile(soundfile, function(err, buf) {
        if (err) throw err
        context.decodeAudioData(buf, function(audioBuffer) {
            console.log(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate, audioBuffer.duration);
            pcmdata = (audioBuffer.getChannelData(0));
            samplerate = audioBuffer.sampleRate;
            findPeaks(pcmdata, samplerate);
            playsound("preview.mp3");
        }, function(err) {
            throw err
        })
    })
}

//dance();
function dance(soundfile) {
    //speak("Sure. I am decoding a sound file that I will dance to. This may take a couple of seconds.") ;
    decodeSoundFile(soundfile);
}

function findPeaks(pcmdata, samplerate, threshold) {
    var interval = 0.05 * 1000;
    index = 0;
    var step = Math.round(samplerate * (interval / 1000));
    var max = 0;
    var prevmax = 0;
    var prevdiffthreshold = 0.3;

    //loop through song in time with sample rate
    var samplesound = setInterval(function() {
        if (index >= pcmdata.length) {
            clearInterval(samplesound);
            console.log("finished sampling sound")
            iswaving = false;
            setLEDColor("white", 255);
            return;
        }
        for (var i = index; i < index + step; i++) {
            max = pcmdata[i] > max ? pcmdata[i].toFixed(1) : max;
        }
        // Spot a significant increase? Wave Arm
        if (max - prevmax >= prevdiffthreshold) {
            waveArm("dance");
            var colors = Object.keys(colorPalette);
            var randIdx = Math.floor(Math.random() * colors.length);
            var randColor = colors[randIdx];
            setLEDColor(randColor, (max - prevmax) * 255)
        }
        prevmax = max;
        max = 0;
        index += step;
    }, interval, pcmdata);
}

/**
 * Wave the arm of your robot X times with an interval
 * @return {[type]} [description]
 */
var mincycle = 500;
var maxcycle = 2300;
var dutycycle = mincycle;

function waveArm(action) {
    iswaving = true;
    var Gpio = pigpio.Gpio;
    var motor = new Gpio(7, {
        mode: Gpio.OUTPUT
    });
    //pigpio.terminate();
    var times = 8;
    var interval = 700;

    if (action == "wave") {
        var pulse = setInterval(function() {
            motor.servoWrite(maxcycle);
            setTimeout(function() {
                if (motor != null) {
                    motor.servoWrite(mincycle);
                }
            }, interval / 3);

            if (times-- === 0) {
                clearInterval(pulse);
                if (!isplaying) {
                    setTimeout(function() {
                        micInstance.resume();
                        iswaving = false;
                        setLEDColor("white", 255);
                    }, 500);
                }
                return;
            }
        }, interval);
    } else {
        motor.servoWrite(maxcycle);
        setTimeout(function() {
            motor.servoWrite(mincycle);
        }, 400);
    }
}
