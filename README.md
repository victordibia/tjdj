# tjdj [Beta - meaning still in development]
Fun speech-based app to get TJBot playing (and dancing to) song snippets using Watson Apis and the Spotify apis

## How It Works
- Listen for voice commands containing song name e.g play cry me a river
- Recognize the word play and then trigger a spotify search for the song name
- Download the song preview (mp3)
- Convert to wav format (for decoding and sampling)
- Play song and dance to it.


##Dependencies

This app requires mpg321 to convert an mp3 file to a wav file.

    sudo apt-get update
    sudo apt-get install mpg321    

##Running

Start the application. (Note: you need sudo access)

    sudo node tjdj.js     

Then you should be able to speak to the microphone and ask your TJBot to play a song

    play song smooth criminal by michael jackson
    play song

For the dance command, your robot processes wav files in the sounds folder. Please ensure you have a .wav file there and set that as your sound file.


Dependencies List

- Watson Developer Cloud : [Watson Speech to Text](https://www.ibm.com/watson/developercloud/speech-to-text.html), [Watson Conversation](https://www.ibm.com/watson/developercloud/conversation.html), and [Watson Text to Speech](https://www.ibm.com/watson/developercloud/text-to-speech.html).
- [mic](https://www.npmjs.com/package/mic) npm package : for reading audio input
- [pigio](https://www.npmjs.com/package/pigpio) npm package : Fast (software) GPIO, PWM, servo control, state change notification, and interrupt handling on the Raspberry Pi.
- [web-audio-api](https://www.npmjs.com/package/web-audio-api) : implementation (partial) of the HTML5 web audio api, used to decode sound files.
- [underscorejs](https://www.npmjs.com/package/underscore) : functional programming helper library for data manipulation.
- [node-aplay](https://www.npmjs.com/package/node-aplay) : Simple nodejs wrapper for aplay.
- [rpi-ws281x-native] (https://www.npmjs.com/package/rpi-ws281x-native): basic set of functions to write data to a strip of ws2811/ws2812 LEDs.
