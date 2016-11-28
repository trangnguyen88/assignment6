/* jshint browser: true, jquery: true, camelcase: true, indent: 2, undef: true, quotmark: single, maxlen: 80, trailing: true, curly: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, nonew: true, unused: true, strict: true */

//requirements
var express = require('express'),
    http = require('http'),
    body = require('body-parser'),
    redis = require('redis').createClient(),
    mongo= require('mongodb').MongoClient,
    test = require('assert');
    app = express(),
    url='mongodb://localhost/questionnaire';
    server= require('http').createServer(app);
    io=require('socket.io').listen(server);

//global variable
var questionnaire;
var questionId=0; //used so taht each question get a different Id
var random;     //randomizes the question for user side
var sendThisQuestion={}; //question to send
var checkAnswer={}; // check client Answer will contain answer and id
var score={};   // current score for player

server.listen(3000);
app.use(body.urlencoded({extended:false}));
app.use(body.json());
app.use(express.static(__dirname+'/client'));


/*****************************************************
  start database
******************************************************/
mongo.connect(url, function(err,db)
 {
       'use strict';

       questionnaire=db.collection('questionnaire');
       cleanColection(questionnaire);
       loadSomeQuestions(questionnaire);
       redis.flushall();
       console.log("Flushing all user scores of previous Trivia Session");
 });


/******************************************************
     takes db and empties it outuppon complition displays
     Collection removed.
*******************************************************/
function cleanColection(questionnaire)
{
  	'use strict';
    questionnaire.remove({},function (err, db)
    {
     if(err)
     {
         console.log('Couldnt remove collection');
     }
     else
      {
         console.log('Collection removed ');
     }
    });
}

/*****************************************************
 takes current db and loads some pregenerated
    questions
******************************************************/
function loadSomeQuestions(questionnaire)
{
    'use strict';
    questionnaire.insert({question:'What is the Aloha State?', answer:'Hawaii', questionId:++questionId});
    questionnaire.insert({question:'What is the world longest river?', answer:'Amazon', questionId:++questionId});
    questionnaire.insert({question:'Who is the president-elect of USA this year? ', answer:'Donald Trump', questionId:++questionId});
    questionnaire.insert({question:'What is the largest state in the USA?', answer:'Alaska', questionId:++questionId});
    questionnaire.insert({question:'Which state is the Golden State?', answer:'California', questionId:++questionId});
    questionnaire.insert({question:'Which state is called the volunteer State?', answer:'Tennessee', questionId:++questionId});
}


app.post('/login',function(req,res){
   console.log("User :" + req.body.user + " joined the game");
   'use strict';
   
   
   redis.exists(req.body.user,function(err,value)
            		 {
                            console.log(value + " user exist key");
  			    if( value == 0){ //Only insert if a new user
     				redis.set(req.body.user,"0,0");
     				console.log("Adding initial score of 0,0 for user :" + req.body.user);
                                publishScores();
   			    }
   			    else{
     				console.log("Returning user :" + req.body.user);
                                publishScores();
   			    }
            		 });
   
});


 /*****************************************************
    home route
 ******************************************************/
app.get('/',function(req,res)
    {
      	'use strict';
          res.send(index.html);
    });

/*****************************************************
   answer post route
    checks if the answer provided by the client is right
    if so increments right counter
    else increment wrong counter
******************************************************/
app.post('/answer',function(req,res)
    {
        console.log("User answering : " + req.body.user);
      	'use strict';
        questionnaire.findOne({questionId:parseInt(req.body.questionId)},function (err, ans)
            {
                if(err)
                {
                    res.send('error');
                }
                 else
                 {
                     if(req.body.answer.toUpperCase()===ans.answer.toUpperCase())
                     {
                         checkAnswer.correct=true;
                         redis.get(req.body.user,function(err,value)
            		 {
  			    var values = value.split(",");
			    redis.set(req.body.user, (parseInt(values[0]) + 1) + "," + values[1]);
                            console.log("Sending score changed event");
			    publishScores();
            		 });
                         
                      }
                      else
                      {
                          checkAnswer.correct=false;
                          redis.get(req.body.user,function(err,value)
            		  {
                             var values = value.split(",");
			     redis.set(req.body.user, values[0] + "," + (parseInt(values[1]) + 1));
                             console.log("Sending score changed event");
			     publishScores();
            		  });
                      }
                      
                   }
              });
    });

/*****************************************************
       answer get route
        sends an object for client to check answer
******************************************************/
app.get('/answer',function(req,res)
    {
      	    'use strict';
            res.json(checkAnswer);
    });

/*****************************************************
           question get route
            sends a random qustion to client
******************************************************/
app.route('/question')
    .get(function(req,res)
            {
                console.log("received request for next question");
              	'use strict';
                random = Math.floor((Math.random() * questionId) + 1);
                questionnaire.findOne({questionId:random},function (err, askQuestion)
                {
                    if(err)
                    {
                        res.send('error');
                        console.log("error");
                    }
                    else
                     {
                         sendThisQuestion.question = askQuestion.question;
                         sendThisQuestion.questionId = askQuestion.questionId;
                         res.send(JSON.stringify(sendThisQuestion));
                     }
                });

            })
/*****************************************************
    question post route
    Gets a question and answer from client.
    it assigns an answerId from curent answerId counter
******************************************************/
    .post(function(req,res)
            {
		'use strict';
           	var newQuestion=req.body;
                newQuestion.questionId= ++questionId;
                questionnaire.insert(newQuestion);
            });

/*****************************************************
    score post route
    stores the current values of right and wrong
    into score. Then passes score to client
******************************************************/
app.get('/score',function(req,res)
    {
        var user = req.param('user');
        'use strict';
        redis.get(user,function(err,value)
            		 {
                            if(value == null){
                              score.right = 0;
                              score.wrong = 0;
                            }
                            else{
                              var values = value.split(",");
			      score.right = values[0];
                              score.wrong = values[1];
                            }
            		 });
        res.json(score);
    });

app.get('/scores',function(req,res)
    {
        console.log("Getting all scores");
        var scores = [];
    	redis.keys('*', function(err, userlist) {
       	   var keys = Object.keys(userlist);
           var i = 0;
           
           keys.forEach(function (l) {
              redis.get(userlist[l], function(e, value) {
                i++;
                    if (e) {console.log(e)} else {
                    //console.log("Found score :" + value);
                    var values = value.split(",");
		    var s = {};
                    s.user = userlist[l];
                    s.right = values[0];
                    s.wrong = values[1];
                    scores.push(s);
                    //console.log("Pushing score : " + s + " to scores");
                    if (i == keys.length) {
                       res.json(scores);
                    }
                }

              });
          });
    	});
     
    });

function publishScores()
{
	var scores = [];
    	redis.keys('*', function(err, userlist) {
       	   var keys = Object.keys(userlist);
           var i = 0;
           
           keys.forEach(function (l) {
             	redis.get(userlist[l], function(e, value) {
                    i++;
                    if (e) {console.log(e)} else {
                    var values = value.split(",");
		    var s = {};
                    s.user = userlist[l];
                    s.right = values[0];
                    s.wrong = values[1];
                    scores.push(s);
                    if (i == keys.length) {
		    io.sockets.emit('score_changed', scores);
                    }
                }

              });
          });
    	});
}



console.log('server listening on  3000');
