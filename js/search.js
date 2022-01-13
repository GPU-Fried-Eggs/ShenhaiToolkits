const hour = document.querySelector(".hours");
const minutes = document.querySelector(".minutes");

function clock() {
    let date = new Date();
    let h = date.getHours();
    let m = date.getMinutes();
    hour.innerHTML = h < 10 ? `0${h}`: h;
    minutes.innerHTML = m < 10 ? `0${m}`: m;
}

window.onload = function (){
    clock();
    setInterval(clock, 1000);
}

function search(form) {
    let data = new FormData(form);
    let searchTarget = data.get("target");
    let searchText = data.get("key");
    if(searchText.length === 0) return false;
    switch (searchTarget) {
        case "Google":
            window.open("https://www.google.com/search?q=" + searchText);
            return true;
        case "Github":
            window.open("https://github.com/search?q=" + searchText);
            return true;
        case "Youtube":
            window.open("https://www.youtube.com/results?search_query=" + searchText);
            return true;
        case "Pixiv":
            window.open("https://www.pixiv.net/tags/" + searchText);
            return true;
        default:
            return false;
    }
}