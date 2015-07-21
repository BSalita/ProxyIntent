
// Javacript for proxying intent

var http = require('http');

var MyApplicationId = "amzn1.echo-sdk-ams.app. blah blah"; // change to your ApplicationId
var MyEndpoint = "http://www.example.com:8080"; // change to your Endpont

/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * For additional samples, visit the Alexa Skills Kit developer documentation at
 * https://developer.amazon.com/appsandservices/solutions/alexa/alexa-skills-kit/getting-started-guide
 */

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event=" + JSON.stringify(event));

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */

        if (event.session.application.applicationId === MyApplicationId)
            ; // from Echo
        else if (event.session.application.applicationId === "amzn1.echo-sdk-ams.app.[unique-value-here]")
                ; // from Amazon Lambda Test ... or intruder
        else
            context.fail("Invalid Application ID");

        console.log("new:" + event.session.new);
        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session, function callback(sessionAttributes, speechletResponse) {
                console.log("new: speechletResponse:" + speechletResponse);
            });
        }

        console.log("type:" + event.request.type);
        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                     event.session,
                     function callback(sessionAttributes, speechletResponse) {
                         context.succeed(buildResponse(sessionAttributes, speechletResponse));
                     });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                     event.session,
                     function callback(sessionAttributes, speechletResponse) {
                         context.succeed(buildResponse(sessionAttributes, speechletResponse));
                     });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session, function callback(sessionAttributes, speechletResponse) {
                console.log("SessionEndedRequest: speechletResponse:" + speechletResponse);
                context.succeed();
            });
            //context.succeed(); // I don't believe it is correct to have context.succeed() here. It prevents OnSessionEnded() from being raised.
        } else
            context.fail("Exception: unknown event.request.type");
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session, callback) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
                + ", sessionId=" + session.sessionId);

    // Dispatch to your skill's Start.
    var jsonStartedRequest = JSON.stringify(sessionStartedRequest);
    var jsonSession = JSON.stringify(session);
    var url = MyEndpoint + "/start?request=" + escape(jsonStartedRequest) + "&session=" + escape(jsonSession);
    httpCallAsync(url, callback);
}

/**
 * Called when the session ends.
 */
function onSessionEnded(sessionEndedRequest, session, callback) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
                + ", sessionId=" + session.sessionId);

    // Dispatch to your skill's End.
    var jsonEndedRequest = JSON.stringify(sessionEndedRequest);
    var jsonSession = JSON.stringify(session);
    var url = MyEndpoint + "/end?request=" + escape(jsonEndedRequest) + "&session=" + escape(jsonSession);
    httpCallAsync(url, callback);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
                + ", sessionId=" + session.sessionId);

    // Dispatch to your skill's Launch.
    var jsonLaunchRequest = JSON.stringify(launchRequest);
    var jsonSession = JSON.stringify(session);
    var url = MyEndpoint + "/launch?request=" + escape(jsonLaunchRequest) + "&session=" + escape(jsonSession);
    httpCallAsync(url, callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("Called onIntent intent=" + intentRequest.intent
                + ", intentName=" + intentRequest.intent.name);

    // Dispatch to your skill's Intent.
    var jsonIntentRequest = JSON.stringify(intentRequest);
    var jsonSession = JSON.stringify(session);
    var url = MyEndpoint + "/intent?request=" + escape(jsonIntentRequest) + "&session=" + escape(jsonSession);
    httpCallAsync(url, callback);
}

function httpCallAsync(url, callback) {
    console.log("httpCall: url=" + url);

    console.log("httpCall: before http.get:" + url);
    http.get(url, function (res) {
        console.log("httpCall: after http.get:" + res.on);
        var responseString = '';

        res.on('data', function (data) {
            console.log("httpCall: entered data on");
            responseString += data;
            console.log("httpCall: exited data on");
        })

        res.on('error', function (e) {
            console.log("httpCall: Got error: " + e.message);
        })

        res.on('end', function () {
            console.log("httpCall: entered end on");
            if (callback !== undefined) {
                var repromptText = "";

                var cardTitle = "Alexa HA Request";
                var sessionAttributes = {};

                console.log("httpCall: before parse: responseString:" + responseString);
                var response = JSON.parse(responseString);
                console.log("httpCall: after parse: response:" + response);
                var speechOutput = response.text;
                var shouldEndSession = response.shouldEndSession;

                console.log("httpCall: before callback: sessionAttributes:" + sessionAttributes + " cardTitle:" + cardTitle + " speechOutput:" + speechOutput + " repromptText:" + repromptText + " shouldEndSession:" + shouldEndSession);
                callback(sessionAttributes,
                 buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
            }
            console.log("httpCall: exiting end on");
        })
    })
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    }
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    }
}