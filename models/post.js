// const mongoose=require('mongoose')
// const {Schema,model}=mongoose

// const PostSchema=new Schema({
//     title:String,
//     summary:String,
//     content:String,
//     cover:String,
//     author:{type:Schema.Types.ObjectId,ref:'User'}
//     //the author is set to the id of user that is creating the post.
// },{
//     timestamps:true
// })

// const PostModel=model('post',PostSchema)

// module.exports=PostModel

// Update the 'post' schema to store image data in the database
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const PostSchema = new Schema({
  title: String,
  summary: String,
  content: String,
  cover:String,
  // imageData: Buffer, // Store image data as a binary Buffer
  // imageContentType: String, // Store the content type of the image (e.g., 'image/jpeg')
  author: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true
});

const PostModel = model('post', PostSchema);

module.exports = PostModel;
