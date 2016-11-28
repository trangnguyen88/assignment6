/* jshint browser: true, jquery: true, camelcase: true, indent: 2, undef: true, quotmark: single, maxlen: 80, trailing: true, curly: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, nonew: true, unused: true, strict: true */


var main = function()
{
    
    
    function viewModel(){
	var self = this;
        self.allUsers = ko.observableArray(); //Get an empty knockout array from knockout framework
        self.correctScore = ko.observable('0');
	self.incorrectScore = ko.observable('0');
	self.question = ko.observable();
	self.answer=ko.observable();
    }

    var vm = new viewModel(); //Hold the viewmodel in a variable so that it can be reffered inside socket.io events
    ko.applyBindings(vm);
    
    var socket = io();

    socket.on('score_changed',function(scores){
      	vm.allUsers.removeAll();
       	for (var i in scores) {
  		var score = scores[i];
         
  		vm.allUsers.push(score.user + ' (' + score.right + ' , ' + score.wrong + ')');
           	if(score.user == currentUser.user)
	   	{
                   vm.correctScore(score.right);
		   vm.incorrectScore(score.wrong);
           	}
	}
    });

    
    
    var currentUser = {user:"guest"};
    var user = prompt("Please enter your name", "");
    if (user != null) {
       currentUser.user = user;
    }
    

    'use strict';
    //local variable
    var currentQuestion={}; //stores the question to be showed

     
    //login
    $.post('/login', currentUser,function ()
           {
               console.log('Loggin in :'+ currentUser);
          });

    //start first question
    $.get('/question', function (questionaire)
    {
        currentQuestion=JSON.parse(questionaire);
	vm.question("Question : " + currentQuestion.question);
    });

    //get all scores of the users when the page load. only one time. rest of the events will be send by socket.io to the client
    $.get('/scores', function (scores)
    {
        vm.allUsers.removeAll();
       	for (var i in scores) {
  		var score = scores[i];
         
  		vm.allUsers.push(score.user + ' (' + score.right + ' , ' + score.wrong + ')');
           	if(score.user == currentUser.user)
	   	{
                   vm.correctScore(score.right);
		   vm.incorrectScore(score.wrong);
           	}
	}
    });

    
    /*****************************************************
        Upon click on next. it conects to server.
        Retrieves and displays question
    ******************************************************/
    $('#next').on('click', function()
    {
        //$('#question .questionAsked').remove();
        $.get('/question', function (questionaire)
        {
            currentQuestion=JSON.parse(questionaire);
	    vm.question("Question : " + currentQuestion.question);
        });
    });

    /*****************************************************
        Upon click on submit-answer. it sends data from
        input fields Answe to server.
        it Retrieves and displays score from /score
    ******************************************************/
    $('#submit-answer').on('click', function ()
     {
          if(vm.answer() == null || vm.answer() == "")
		return;
          var currentAnswer={};
	  currentAnswer.answer = vm.answer();
          currentAnswer.questionId=currentQuestion.questionId;
          currentAnswer.user=currentUser.user;

          $.post('/answer', currentAnswer,function ()
           {
               console.log('passing:'+currentAnswer);
          });

          vm.answer('');
	
          $.get('/question', function (questionaire)
          {
              currentQuestion=JSON.parse(questionaire);
              vm.question("Question : " + currentQuestion.question);
          });

    });
};


$(document).ready(main);
