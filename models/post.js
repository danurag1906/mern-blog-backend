const mongoose=require('mongoose')
const {Schema,model}=mongoose

const PostSchema=new Schema({
    title:String,
    summary:String,
    content:String,
    cover:String,
    author:{type:Schema.Types.ObjectId,ref:'User'}
    //the author is set to the id of user that is creating the post.
},{
    timestamps:true
})

const PostModel=model('post',PostSchema)

module.exports=PostModel