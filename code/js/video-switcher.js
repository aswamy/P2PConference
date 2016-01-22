$('.broadcaster').click(function() {
    var temp = this.src;
    this.src = $('#remoteVideo0')[0].src;
    $('#remoteVideo0')[0].src = temp;
});