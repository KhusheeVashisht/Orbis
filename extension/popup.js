const startButton =
    document.getElementById("startButton");

const stopButton =
    document.getElementById("stopButton");

const statusText =
    document.getElementById("statusText");

const statusIndicator =
    document.getElementById("statusIndicator");


startButton.addEventListener("click", () => {

    chrome.tabs.create({
        url: chrome.runtime.getURL("mic.html")
    });

});