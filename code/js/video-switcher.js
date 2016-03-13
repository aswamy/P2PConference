function videoSwitcher() {

    //var bigvid = $("#main-broadcaster video");
    //$("#casters").append(bigvid)

    var temp = this.src;
    this.src = $('#mainvideo')[0].src;
    $('#mainvideo')[0].src = temp;
}