import OutCall "http-outcalls/outcall";

actor {
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public shared ({ caller }) func startConversion(youtubeUrl : Text, format : Text) : async Text {
    let url = "https://loader.to/ajax/download.php?start=1&end=1&format=" # format # "&url=" # youtubeUrl;
    let headers = [{ name = "Referer"; value = "https://loader.to/" }];
    try {
      await OutCall.httpGetRequest(url, headers, transform);
    } catch (e) {
      "{\"success\":false,\"error\":\"" # e.message() # "\"}";
    };
  };

  public shared ({ caller }) func getProgress(jobId : Text) : async Text {
    let url = "https://loader.to/ajax/progress.php?id=" # jobId;
    let headers = [{ name = "Referer"; value = "https://loader.to/" }];
    try {
      await OutCall.httpGetRequest(url, headers, transform);
    } catch (e) {
      "{\"success\":false,\"error\":\"" # e.message() # "\"}";
    };
  };
};
