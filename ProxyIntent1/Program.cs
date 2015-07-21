
// C# program to execute Amazon Echo intents. This program listens for proxied requests sent from an Amazon Lambda.
// Run in Administrator mode -OR- permit port use by opening Administrator CMD window and executing "netsh http add urlacl http://+:8080/ user=<yourusername>".

using System;
using System.Net;

namespace ProxyIntent1
{
    class Program
    {
        // At least one URI prefix is required. A prefix is a starting fragment of the received url, e.g. http://example.com:8080/ or a wildcard http://+:8080.
        // Possible security concern? Maybe need to change "+" wildcard to exact url to fragment?
        const string MyEndpoint = "http://+:8080/";
        static void Main(string[] args)
        {
            // Create a HTTP listener.
            HttpListener listener = new HttpListener();

            listener.Prefixes.Add(MyEndpoint);
            listener.Start(); // will abort if port not permitted and not running in Administrator mode.

            try
            {
                ListenerLoop(listener);
                Console.Write(DateTime.UtcNow + ": Listening at");
                foreach (string p in listener.Prefixes)
                    Console.Write(" " + p);
                Console.WriteLine("\nPress any key to exit...");
                Console.ReadKey();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Exception: Message:" + ex.Message);
            }
            finally
            {
                listener.Close();
            }
        }

        public static async void ListenerLoop(HttpListener listener)
        {
            bool quit;
            do
            {
                quit = await listener.GetContextAsync().ContinueWith(ProcessRequest);
            } while (quit);
        }

        public static bool ProcessRequest(System.Threading.Tasks.Task<HttpListenerContext> tcontext)
        {
            HttpListenerContext context = tcontext.Result;
            HttpListenerRequest request = context.Request;
            Console.WriteLine("\n" + DateTime.UtcNow + ": Incoming");
            Console.WriteLine("Request url:" + request.Url.ToString());
            Console.WriteLine("AbsolutePath:" + request.Url.AbsolutePath);

            HttpListenerResponse response = context.Response;
            Newtonsoft.Json.Linq.JObject requestQuery;
            if (request.QueryString.GetValues("request") == null)
                requestQuery = null;
            else
            {
                Console.WriteLine("QueryString:" + request.QueryString.GetValues("request")[0]);
                requestQuery = Newtonsoft.Json.Linq.JObject.Parse(request.QueryString.GetValues("request")[0]);
            }

            switch (request.Url.AbsolutePath)
            {
                case "/intent":
                    {
                        string name = requestQuery["intent"]["name"].ToString();
                        Console.WriteLine("name:" + name);
                        switch (name)
                        {
                            case "HelpIntent":
                                Helpers.Respond(context, response, true, "Sorry, I'm not so helpful now.");
                                break;
                            case "MyColorIsIntent":
                                Helpers.Respond(context, response, false, "The test has worked. Yeah.");
                                break;
                            case "WhatsMyColorIntent":
                                Helpers.Respond(context, response, true, "I'm not sure.");
                                break;
                            default:
                                Helpers.Respond(context, response, true, "Invalid Intent");
                                break;
                        }
                    }
                    break;
                case "/start": // doesn't seem to be able to be proxied from Amazon Lambda
                    Console.WriteLine("Starting:");
                    Helpers.Respond(context, response, false, "starting");
                    break;
                case "/launch":
                    Console.WriteLine("Launching:");
                    Helpers.Respond(context, response, false, "launching");
                    break;
                case "/end": // doesn't seem to be able to be proxied from Amazon Lambda
                    Console.WriteLine("Ending:");
                    Helpers.Respond(context, response, false, "ending");
                    break;
                default:
                    throw new ApplicationException();
            }
            return true;
        }
    }
}

class Helpers
{
    public static void Respond(HttpListenerContext context, HttpListenerResponse response, bool shouldEndSession)
    {
        Respond(context, response, shouldEndSession, "");
    }

    public static void Respond(HttpListenerContext context, HttpListenerResponse response, bool shouldEndSession, string responseString)
    {
        string responseJson = CreateJsonResponse(shouldEndSession, responseString);
        Console.WriteLine(DateTime.UtcNow + " - " + context.Request.RemoteEndPoint.Address.ToString() + " - " + responseJson);
        byte[] buffer = System.Text.Encoding.UTF8.GetBytes(responseJson);
        // Get a response stream and write the response to it.
        response.ContentLength64 = buffer.Length;
        System.IO.Stream output = response.OutputStream;
        output.Write(buffer, 0, buffer.Length);
        // You must close the output stream.
        output.Close();
    }

    public static string CreateJsonResponse(bool shouldEndSession, string responseText, string repromptText = "")
    {
        string returnString = "{";
        returnString += "\"shouldEndSession\": ";
        returnString += shouldEndSession.ToString().ToLower(); // must return lower case bool 
        returnString += ",";
        returnString += "\"text\": \"";
        returnString += responseText + "\"";
        returnString += ",";
        returnString += "\"reprompt\": \"";
        returnString += repromptText + "\"";
        returnString += "}";
        return returnString;
    }
}
