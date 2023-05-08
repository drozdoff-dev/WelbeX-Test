const mongoObjectId    = require('mongodb').ObjectId;
const bcrypt           = require('bcryptjs');
const jwt              = require("jsonwebtoken");
const secret_key       = 'njbksgdUDHsdsa';

module.exports = function(app, database) {
    app.post('/', async (req, res) => {
        let params = req.body;

        const users = await database.db("nodejs").collection("users").find().toArray();
        const blogs = await database.db("nodejs").collection("blogs").find().toArray();
        res.status(200).json({users: users, blogs: blogs, params: params});
    });

    app.post('/blogs', async (req, res) => {
        let header = req.headers['authorization'];
        let params = req.body;

        if(typeof header !== 'undefined')
        {
            let bearer = header.split(' ');
            let token = bearer[1];
            req.token=token;
        }

        if(params['type'] == 'create' && req.token)
        {
            let message = params['message'];
            let media = params['media'];
            if(!message && !media) return res.status(401).json({error: 'Not all fields have been transferred.'});
            let date = new Date().toLocaleDateString();
            jwt.verify(req.token,secret_key,async function (err,authorizedata)
            {
                if(err)
                {
                    return res.status(403).json({error: 'Could not connect to the protected route.'});
                }
                else
                {
                    //create
                    const insert_blog = await database.db("nodejs").collection("blogs").insertOne({ author: authorizedata['nickname'], message: message, media: media, date: date });
                    if(insert_blog)
                    {
                        return res.status(200).json({
                            message: 'The token has been confirmed and a blog has been created.',
                            authorizedata
                        });
                    }
                    else
                    {
                        return res.status(401).json({error: 'Error on creating blog.'});
                    }
                }
            });
        }
        else if(params['type'] == 'delete' && req.token)
        {
            let blog_id = params['id'];
            if(!blog_id) return res.status(401).json({error: 'Not all fields have been transferred.'});
            jwt.verify(req.token,secret_key,async function (err,authorizedata)
            {
                if(err)
                {
                    return res.status(403).json({error: 'Could not connect to the protected route.'});
                }
                else
                {
                    //delete
                    const search_blog = await database.db("nodejs").collection("blogs").find({_id: new mongoObjectId(blog_id)}).toArray();
                    if(search_blog.length > 0)
                    {
                        if(search_blog[0]['author'] == authorizedata['nickname'])
                        {
                            await database.db("nodejs").collection("blogs").deleteOne({_id: new mongoObjectId(blog_id)});
                            return res.status(200).json({
                                message: 'The token is confirmed and the blog is deleted.',
                                authorizedata
                            });
                        }
                        else
                        {
                            return res.status(403).json({error: 'You are not the author of the blog.'});
                        }
                    }
                    else
                    {
                        return res.status(403).json({error: 'Blog not found.'});
                    }
                }
            });
        }
        else if(params['type'] == 'edit' && req.token)
        {
            let blog_id = params['id'];
            let new_message = params['message'];
            let new_media = params['media'];
            if(!blog_id) return res.status(401).json({error: 'The news number has not been transmitted.'});
            if(!new_message && !new_media) return res.status(401).json({error: 'Not all fields have been transferred.'});
            jwt.verify(req.token,secret_key,async function (err,authorizedata)
            {
                if(err)
                {
                    return res.status(403).json({error: 'Could not connect to the protected route.'});
                }
                else
                {
                    //edit
                    const search_blog = await database.db("nodejs").collection("blogs").find({_id: new mongoObjectId(blog_id)}).toArray();
                    if(search_blog.length > 0)
                    {
                        if(search_blog[0]['author'] == authorizedata['nickname'])
                        {
                            await database.db("nodejs").collection("blogs").updateOne({_id: new mongoObjectId(blog_id)}, { $set: {message: new_message, media: new_media} });
                            return res.status(200).json({
                                message: 'The token is confirmed and the blog is edited.',
                                authorizedata
                            });
                        }
                        else
                        {
                            return res.status(403).json({error: 'You are not the author of the blog.'});
                        }
                    }
                    else
                    {
                        return res.status(403).json({error: 'Blog not found.'});
                    }
                }
            });
        }
        else if(params['type'] == 'check')
        {  
            let page = params['page'];
            if(!page || page < 1) return res.status(401).json({error: 'Page not passed.'});
            page = page-1;
            let skip = page*20;
            const search_blogs = await database.db("nodejs").collection("blogs").find().skip(skip).sort({_id:1}).limit(20).toArray();
            if(search_blogs.length > 0)
            {
                let max_blog = skip+search_blogs.length;
                return res.status(200).json({
                    message: 'Blogs have been successfully received. ' + skip + '-' + max_blog,
                    blogs: search_blogs
                });
            }
            else
            {
                return res.status(401).json({error: 'There are no blogs.'});
            }
        }
        else
        {
            return res.status(401).json({error: 'Error when passing the method.'});
        }
    });

    app.post('/users', async (req, res) => {
        let params = req.body;

        if(params['type'] == 'reg')
        {
            let nickname = params['nickname'];
            let email = params['mail'];
            let password = params['pass'];
            if(!nickname || !email || !password) return res.status(401).end('Fill in all the fields.');
            const result = await database.db("nodejs").collection("users").find({ $or: [ {nickname: nickname}, {email: email} ] }).toArray();
            if(result.length == 0)
            {
                password = await bcrypt.hash(password, 10);
                const insert_user = await database.db("nodejs").collection("users").insertOne({ nickname: nickname, email: email, password: password });
                if(insert_user)
                {
                    return res.status(200).json({message: 'The user has been successfully registered.'});
                }
                else
                {
                    return res.status(401).json({error: 'Error on registration.'});
                }
            }
            else
            {
                return res.status(401).end('NickName or Email already exist.');
            }
        }
        else if(params['type'] == 'auth')
        {
            let login = params['login'];
            let password = params['pass'];
            if(!login || !password) return res.status(401).end('Fill in all the fields.');
            const result = await database.db("nodejs").collection("users").find({ $or: [ {nickname: login}, {email: login} ] }).toArray();
            if(result.length > 0)
            {
                bcrypt.compare(password, result[0]['password'], function(err, result_crypt) {
                    if (err)
                    {
                        return res.status(401).json({error: "Unauthorized Access."});
                    }
                    if (result_crypt)
                    {
                        let JWTToken = jwt.sign(
                            {
                                email: result[0]['email'],
                                nickname: result[0]['nickname'],
                                _id: result[0]['_id']
                            },
                            secret_key,
                            {
                                expiresIn: "2h"
                            }
                        );
                        return res.status(200).json({message: "Welcome to the JWT Auth.", token: JWTToken});
                    }
                    return res.status(401).json({error: "Unauthorized Access."});
                });
            }
            else
            {
                return res.status(401).json({error: 'The entered data is not correct.'});
            }
        }
        else
        {
            return res.status(401).json({error: 'Type users method not found.'});
        }
    });
  };
