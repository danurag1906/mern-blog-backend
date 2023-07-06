const express=require('express')
const cors=require('cors')
const mongoose=require('mongoose')
const user=require('./models/user')
const post=require('./models/post')
const bcrypt=require('bcryptjs')
const salt=bcrypt.genSaltSync(10)
const jwt=require('jsonwebtoken')
const secret='jncaqjnqoi3u928bfew8932'
const cookieparser=require('cookie-parser')
const app = express()
const multer=require('multer')
const uploadMiddleware=multer({dest:'uploads/'}) //we will save all our file uploads in this folder.
const fs=require('fs')
const dotenv=require('dotenv')
dotenv.config()
const db_url=process.env.DATABASE_URL
const port=process.env.PORT || 4000
const origin_url=process.env.ORIGIN_URL
const base_url=process.env.BASE_URL

//here we need to mention these parameters to allows cors to use cookies/credentials to be saved in the session.
app.use(cors({credentials:true,origin:"https://dulcet-crepe-aceba4.netlify.app/"}))

//parse the json request in the endpoint call get,post.
app.use(express.json())

//parse the cookie to be used in endpoints i.e, get and post requests.
app.use(cookieparser())

//to access the uploads folder.
app.use('/uploads',express.static(__dirname+'/uploads'))

// console.log(db_url);
// console.log(origin_url);

mongoose.connect(`${db_url}`).then(()=>{
    console.log("connected to db");
})
.catch((err)=>{
    console.log(err);
    console.log("failed to connect");
})

app.get('/test',(req,res)=>{
    res.json("test ok")
})

 //here we get data from front end and send that data to db using the below user.create function.
app.post('/register',async(req,res)=>{
   
    const {username,password}=req.body
    try {
        const UserDoc=await user.create(
            {
                username,
                password:bcrypt.hashSync(password,salt),
            }
            )
        res.json(UserDoc)
    } catch (error) {
        console.log(error);
        res.status(400).json(error)
    }
})


//here we get data from front end and validate if credentials are okay.

app.post('/login',async (req,res)=>{
    const {username,password}=req.body

    //find a doc in db with username as 'username' variable.

    const userDoc=await user.findOne({username})
    // console.log(userDoc);

    //comparing the user entered password with the one in database.

    const passwordOk=bcrypt.compareSync(password,userDoc.password)

    // res.send(passwordOk) 
    //if credentials are okay we will create a jwt token and save it in a cookie for future usage.

    if(passwordOk){
        //logged in 
        jwt.sign({username,id:userDoc._id},secret,{},(err,token)=>{
            if (err) throw err;
            //here we are storing the token in the form of a cookie instead of sending it back as json.
            //this token will help us to identify the user currently logged in.
            res.cookie('token',token).json({
                id:userDoc._id,
                username,
            })
        })
    }
    else{
        //not logged in
        res.status(400).json('wrong credentials')
    }
})


//we will use this get request to know if a user is logged in or not by accessing the token from the cookie. If it is a valid token then that particular user is logged in.
app.get('/profile',(req,res)=>{
    const {token}=req.cookies
    // console.log(token);
    //we are replacing the token with empty string ('') . so to avoid and error while fetching user profile we are placing an 'if' condition.
    if(token!=''){
        jwt.verify(token,secret,{},(err,info)=>{
            if (err) throw err
            res.json(info)
            //here info consits of id,username and iat(issued at)
        })
    }
    
})


//while loggin out we will replace the token with an empty string i.e, ''.
//now since the token is not available, the user will be logged out.
app.post('/logout',(req,res)=>{
    res.cookie('token','').json('ok')
})


//get all the post data from createPost.js and send it to 'post' collection in db
app.post('/post',uploadMiddleware.single('files'),async (req,res)=>{
    const {originalname,path}=req.file
    const parts=originalname.split('.')
    const ext=parts[parts.length-1]
    const newPath=path+'.'+ext
    fs.renameSync(path,newPath)

    //cheking if the token is valid. If so then we will grab all the data from clinet side from req.file and then change the file name and add extension to it.
    const {token}=req.cookies
    jwt.verify(token,secret,{},async(err,info)=>{
        if (err) throw err
        const {title,summary,content}=req.body
        const postDoc=await post.create({
            title,
            summary,
            content,
            cover:newPath,
            author:info.id,
            //we are getting user info from the client side while including the credentials . Then we are linking the user id to the post that is being created via author:info.id 
        })
        res.json(postDoc)
        // res.json(info)
    })

    
})

app.put('/post',uploadMiddleware.single('files'),async (req,res)=>{
    let newPath=''
    if(req.file){
        const {originalname,path}=req.file
        const parts=originalname.split('.')
        const ext=parts[parts.length-1]
        const newPath=path+'.'+ext
        fs.renameSync(path,newPath)
    }

    const {token}=req.cookies
    jwt.verify(token,secret,{},async(err,info)=>{
        if (err) throw err
        const {id,title,summary,content}=req.body
        const postDoc=await post.findById(id)
        const isAuthor = JSON.stringify(postDoc.author)===JSON.stringify(info.id)
        if(!isAuthor){
            return res.status(400).json('you are not the auhtor')

        }

        await post.findOneAndUpdate(
            { _id: id },
            {
              $set: {
                title,
                summary,
                content,
                cover: newPath ? newPath : postDoc.cover,
              },
            },
            { new: true }
          );

        res.json(postDoc)

    })

})


//extra feature by me.
app.delete('/post/:id',async (req,res)=>{
    const {token}=req.cookies;
    jwt.verify(token,secret,{},async(err,info)=>{
        if (err) throw err;

        const postId=req.params.id
        const postDoc=await post.findById(postId)
        // const isAuthor=JSON.stringify(postDoc.author)===JSON.stringify(info.id)

        // if(!isAuthor){
        //     return res.status(400).json('You are not the author');
        // }

        await post.deleteOne({_id:postId})

        res.json('post deleted successfully')

    })
})

//here we get all the posts and these posts are sent back to client i.e, AllPosts.js
app.get('/posts',async(req,res)=>{
    res.send(await post.find().populate('author',['username']).sort({createdAt:-1}))
    //by pouplating we are also able to send the username of that particular author(user) to display it on the client side.
})


app.get('/post/:id',async(req,res)=>{
    const {id} =req.params
    const postDoc=await post.findById(id).populate('author',['username'])
    res.json(postDoc)
})

// mongoose.connect('mongodb+srv://mern-blog:mern-blog@cluster0.ooxjrbw.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => {
//     console.log('Connected to MongoDB');
//     app.post('/register', async (req, res) => {
//       try {
//         const { username, password } = req.body;
//         const UserDoc = await user.create({ username, password });
//         res.json(UserDoc);
//       } catch (error) {
//         console.error('Error creating user:', error);
//         res.status(500).json({ error: 'Failed to create user' });
//       }
//     });
//   })
//   .catch((error) => {
//     console.error('Failed to connect to MongoDB:', error);
//   });


//mongodb+srv://mern-blog:mern-blog@cluster0.ooxjrbw.mongodb.net/?retryWrites=true&w=majority

app.listen(port)