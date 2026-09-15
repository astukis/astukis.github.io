//pasted text conversion start
function pastedConvert(){
  var timeString = document.getElementById('timecamp-input').value;
  try{
    var [h, min] = [+timeString.toString().split('h ')[0], +timeString.toString().split('h ')[1].replace('m','')];
  }
  catch(e){
    return;
  }
    document.getElementById('hours-input').value=h;
    document.getElementById('minutes-input').value=min;

    //document.getElementById('timecamp-input').value='';
}
//pasted text conversion end

//conversion code starts here

var ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
var tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
var teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];

function convert_millions(num) {
  if (num >= 1000000) {
    return convert_millions(Math.floor(num / 1000000)) + " million " + convert_thousands(num % 1000000);
  } else {
    return convert_thousands(num);
  }
}

function convert_thousands(num) {
  if (num >= 1000) {
    return convert_hundreds(Math.floor(num / 1000)) + " thousand " + convert_hundreds(num % 1000);
  } else {
    return convert_hundreds(num);
  }
}

function convert_hundreds(num) {
  if (num > 99) {
    return ones[Math.floor(num / 100)] + " hundred " + convert_tens(num % 100);
  } else {
    return convert_tens(num);
  }
}

function convert_tens(num) {
  if (num < 10) return ones[num];
  else if (num >= 10 && num < 20) return teens[num - 10];
  else {
    return tens[Math.floor(num / 10)] + " " + ones[num % 10];
  }
}

function convert(num) {
  if (num == 0) return "zero";
  else return convert_millions(num);
}

//end of conversion code

//hours to wage conversion starts
function hoursToWage(){
  var h = document.getElementById('hours-input').value;
  var min = document.getElementById('minutes-input').value;
  var rate = document.getElementById('hourly-rate-input').value;

  var wage =parseFloat(h*rate+(min/60)*rate).toFixed(2)
  document.getElementById('wage-output').value = wage+ " \u20AC";

  if(wage%1!=0){
    var [euros, cents] = [+wage.toString().split('.')[0], +wage.toString().split('.')[1]];
    console.log();
    document.getElementById('words-output').value = convert(euros)+ " euros "+ convert(cents)+"cents";
  }
  else{
    var euros = wage;
    console.log();
    document.getElementById('words-output').value = convert(euros)+ " euros";
  }

}
//hours to wage conversion ends
