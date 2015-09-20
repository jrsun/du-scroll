var analyser = null;
var FFT_SIZE = 2048;
// var tracks = null;
// var buflen = 1024;
var buf;

var state = [];

window.onload = function() {
    fillPage();
    audioContext = new AudioContext();
    MAX_SIZE = Math.max(4,Math.floor(audioContext.sampleRate/5000));    // corresponds to a 5kHz signal
    getUserMedia(
        {
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            },
        }, gotStream);

    setInterval(filterOldFreqs, 1000);
    setInterval(duScroll, 10);
}

function fillPage() {
    for (i = 0; i < 1000; i++) {
        var x = $("<p>").append("" + i);
        $("body").append(x)    
    }   
}

function error() {
    alert('Stream generation failed.');
}

function getUserMedia(dictionary, callback) {
    try {
        console.log("in getUserMedia");
        navigator.getUserMedia = 
            navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia;

        navigator.getUserMedia(dictionary, callback, error);
    } catch (e) {
        console.log("there was error");
        alert('getUserMedia threw exception :' + e);
    }
}

function gotStream(stream) {
    console.log('in gotStream');
    // Create an AudioNode from the stream.
    mediaStreamSource = audioContext.createMediaStreamSource(stream);
    // Connect it to the destination.
    analyser = audioContext.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    buf = new Uint8Array( analyser.frequencyBinCount );
    mediaStreamSource.connect( analyser );
    setInterval(updatePitch, 1);
}

function updatePitch() {
    analyser.getByteFrequencyData( buf );
    // console.log(buf);
    var currFreq = getFrequencyFromBuf();
    currTime = Date.now();
    // console.log(state);
    // console.log(currFreq);

    if (currFreq != -1) {
        state.push([currFreq, currTime]);
    }
}

function filterOldFreqs() {
    var historyMilisecondTolerance = 4000;
    var currTime = Date.now();
    var i = state.length - 1;
    while (i >= 0) {
        var timestamp = state[i][1];
        if (Math.abs(timestamp - currTime) > historyMilisecondTolerance) {
            state = state.slice(i + 1, state.length);
            return;
            break;
        }
        i--;
    }
}

function getFrequencyFromBuf() {
    var MIN_LOUDNESS_ALLOWED = 210;
    var max = buf[0];
    var maxIndex = 0;

    for (var i = 0; i < buf.length; i++) {
        if (buf[i] > max) {
            maxIndex = i;
            max = buf[i];
        }
    }

    if (buf[maxIndex] > 210) {
        return maxIndex;
    }
    return -1;
}

function duScroll() {
    // var freqs = state.map(function(x){ return x[0]; });
    // var stdev = standardDeviation(freqs);
    // var avg = average(freqs);
    if (state.length >= 2) {
        console.log('here');
        var mostRecent = state[state.length - 1][0];
        var secondMostRecent = state[state.length - 2][0];
        // if ((Math.abs(mostRecent - avg) <= stdev) && (Math.abs(secondMostRecent - avg) <= stdev)) {
        // scrollBy(0,-50 * (mostRecent - secondMostRecent));
        if (mostRecent - secondMostRecent > 0) {   
            scrollBy(0,-50); 
        }
        else if (mostRecent . secondMostRecent < 0) {
            scrollBy(0, 50);
        }
    }
    // var filtered = filtervalues(state);

}


function filterValues(values) {
    var stdev = standardDeviation(values);
    var avg = average(values);
    return values.filter(function(x) { return Math.abs(x[0] - avg) <= stdev; });
}



function standardDeviation(values){
  var avg = average(values);
  
  var squareDiffs = values.map(function(value){
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });
  
  var avgSquareDiff = average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

function average(data){
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}
