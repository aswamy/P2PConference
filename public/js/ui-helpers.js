function videoSwitcher() {
    var temp = this.src;
    this.src = $('#mainvideo')[0].src;
    $('#mainvideo')[0].src = temp;

    //var casters = $("#casters video");
    //for (var i = 0; i < casters.length; i++) {
    //    if($("#casters video")[i].src.indexOf('blob') < 0) {
    //
    //    }
    //}
}

function attach() {
    document.getElementById('attachfile').click();
}

function send() {
    document.getElementById('sendbtn').click();
}

$('#chatinput textarea').on('keydown', function(event) {
    if (event.keyCode == 13) {
        if (!event.shiftKey) {
            send();
            return false;
        }
    }
});
