import { NumberOne } from '@phosphor-icons/react';
import mongoose, { Schema } from 'mongoose';

const userSchema = new mongoose.Schema({
    email: String,
    username: String,
    password: String,
    avatarURL: {
        type: String,
        default: 'https://t4.ftcdn.net/jpg/04/10/43/77/360_F_410437733_hdq4Q3QOH9uwh0mcqAhRFzOKfrCR24Ta.jpg'
    },
    communityIDs: {
        type: [{ type: Schema.Types.ObjectId, ref: 'Community' }],
        default: []
    },
    likedPosts: {
        type: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
        default: []
    },
    participatingEventIds: {
        type: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
        default: []
    }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);

const communitySchema = new mongoose.Schema({
    name: String,
    description: String,
    adminId: {
        type: Schema.Types.ObjectId, ref: 'User'
    },
    logoURL: {
        type: String,
        default: 'https://t4.ftcdn.net/jpg/04/10/43/77/360_F_410437733_hdq4Q3QOH9uwh0mcqAhRFzOKfrCR24Ta.jpg'
    },
    bannerURL: {
        type: String,
        default: 'https://t4.ftcdn.net/jpg/04/10/43/77/360_F_410437733_hdq4Q3QOH9uwh0mcqAhRFzOKfrCR24Ta.jpg'
    },
    followingUserIDs: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        default: []
    },
    merchantIds: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        default: []
    }
}, { timestamps: true });

export const Community = mongoose.model('Community', communitySchema);

const postsSchema = new mongoose.Schema({
    title: String,
    communityId: {
        type: Schema.Types.ObjectId,
        ref: 'Community'
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    body: String,
    attachmentURL: {
        type: String,
        default: ""
    },
    numLikes: {
        type: Number,
        default: 0
    },
    numComments: {
        type: Number,
        default: 0
    },
    likedUserIds: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        default: []
    },
    commentIds: {
        type: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
        default: []
    }
}, { timestamps: true });

export const Posts = mongoose.model('Post', postsSchema);

const commentSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    postId: {
        type: Schema.Types.ObjectId,
        ref: 'Post'
    },
    text: String
}, { timestamps: true });

export const Comments = mongoose.model('Comment', commentSchema);

const eventScheme = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    communityId: {
        type: Schema.Types.ObjectId,
        ref: 'Community'
    },
    title: String,
    description: String,
    attachmentURL: {
        type: String,
        default: ""
    },
    participatingUserids: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        default: []
    },
    likedUserIds: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        default: []
    },
    eventDate: {
        type: Date
    },
    lastDate: {
        type: Date
    }
}, { timestamps: true });

export const Events = mongoose.model('Event', eventScheme);

const notificationsSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    communityId: {
        type: Schema.Types.ObjectId,
        ref: 'Community'
    },
    postId: {
        type: Schema.Types.ObjectId,
        ref: 'Post'
    },
    merchantId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    type: String,
    status: String,
    unread: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const Notifications = mongoose.model('Notification', notificationsSchema);

const itemSchema = new mongoose.Schema({
    merchantId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    communityId: {
        type: Schema.Types.ObjectId,
        ref: 'Community'
    },
    name: String,
    description: String,
    attachmentURL: String,
    price: Number
}, { timestamps: true });

export const Item = mongoose.model('Store', itemSchema);


