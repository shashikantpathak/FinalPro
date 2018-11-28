module.exports = function(async, Club, Users,Message){
    return {
        SetRouting: function(router){
            router.get('/results', this.getResults);
            router.post('/results', this.postResults);
            
            router.get('/members', this.viewMembers);
            router.post('/members', this.searchMembers);
        },
        
        getResults: function(req, res){
            res.redirect('/home');
        },
        
        postResults: function(req, res){
            async.parallel([
                function(callback){
                    const regex = new RegExp((req.body.country), 'gi');
                    
                    Club.find({'$or': [{'country':regex}, {'name': regex}]}, (err, result) => {
                       callback(err, result); 
                    });
                },
                function(callback){
                    Club.aggregate([{
                        $group: {
                            _id: "$country"
                        } }], 
                        (err, newResult) => {
                            callback(err, newResult) ;
                         }); 
                },
                function (callback) {
                    Users.findOne({ 'username': req.user.username })
                        .populate('request.userId')
                        .exec((err, result) => {
                            callback(err, result);
                        })
                },
                function (callback) {
                    const nameRegex = new RegExp("^" + req.user.username.toLowerCase(), "i");
                    Message.aggregate([
                        {
                            $match: {
                                $or: [{ 'senderName': nameRegex },
                                { 'receiverName': nameRegex }]
                            }
                        },
                        { $sort: { 'createdAt': -1 } },
                        {
                            $group: {
                                "_id": {
                                    "last_message_between": {
                                        $cond: [
                                            {
                                                $gt: [
                                                    { substr: ["$senderName", 0, 1] },
                                                    { substr: ["$receiverName", 0, 1] },
                                                ]
                                            },
                                            { $concat: ["$senderName", " and ", "$receiverName"] },
                                            { $concat: ["$receiverName", " and ", "$senderName"] },
                                        ]
                                    }
                                }, "body": { $first: "$$ROOT" }
                            }
                        }],function(err, newResult){
                            const arr = [
                                {path: 'body.sender', model: 'User'},
                                {path: 'body.receiver', model: 'User'}
                            ];
                            
                            Message.populate(newResult, arr, (err, newResult1) => {
                                callback(err, newResult1);
                            });
                        }
                    )
                },
             
            ], (err, results) => {
                const res1 = results[0];
                const res2=results[1];
                const res3=results[2];
                const res4=results[3];
                
                const dataChunk  = [];
                const chunkSize = 3;
                for (let i = 0; i < res1.length; i += chunkSize){
                    dataChunk.push(res1.slice(i, i+chunkSize));
                }
                
                res.render('results', {title: 'Social_Service',chat:res4, user: req.user,country:res2,data:res3, chunks: dataChunk});
            })
        },
        
        viewMembers: function(req, res){
            async.parallel([
                function(callback){
                    Users.find({}, (err, result) => {
                       callback(err, result); 
                    });
                }
            ], (err, results) => {
                const res1 = results[0];
                
                const dataChunk  = [];
                const chunkSize = 4;
                for (let i = 0; i < res1.length; i += chunkSize){
                    dataChunk.push(res1.slice(i, i+chunkSize));
                }
                
                res.render('members', {title: 'Social_Service - Members', user: req.user, chunks: dataChunk});
            })
        },
        logout: function(req, res){
            req.logout();
            req.session.destroy((err) => {
               res.redirect('/');
            });
        },
        
        searchMembers: function(req, res){
            async.parallel([
                function(callback){
                    const regex = new RegExp((req.body.username), 'gi');
                    
                    Users.find({'username': regex}, (err, result) => {
                       callback(err, result); 
                    });
                }
            ], (err, results) => {
                const res1 = results[0];
                
                const dataChunk  = [];
                const chunkSize = 4;
                for (let i = 0; i < res1.length; i += chunkSize){
                    dataChunk.push(res1.slice(i, i+chunkSize));
                }
                
                res.render('members', {title: 'Social_Service', user: req.user, chunks: dataChunk});
            })
        }
    }
}










