import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import session from 'express-session';
import passport from 'passport';
import { Strategy } from 'passport-local';
import { connect } from 'getstream';
import { StreamChat } from 'stream-chat';

import { User, Community, Posts, Comments, Events, Notifications, Item } from './models/models.js';


const app = express();
const port = process.env.PORT || 8000;
const saltRounds = 10

const app_id = process.env.STREAM_APP_ID;
const api_key = process.env.STREAM_API_KEY;
const api_secret = process.env.STREAM_API_SECRET;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const corsConfig = {
    origin: 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsConfig));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60, // 1 hour
        // Remove the domain attribute for localhost
        httpOnly: true,
        sameSite: 'lax',
        secure: false // Make sure this is false for development without HTTPS
    },
}));

app.use(passport.initialize());
app.use(passport.session());



mongoose.connect("mongodb://127.0.0.1:27017/CommUnityDB");

app.get('/', (req, res) => {
    return res.status(200).json({
        message: "Hello World"
    });
});


app.post('/register', async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const username = req.body.username;

    try {
        const emailCheck = await User.findOne({ email: email });
        if (emailCheck) {
            return res.status(200).json({ message: "An account with this email address already exists. Please log in or use a different email." });
        }
        const usernameCheck = await User.findOne({ username: username });
        if (usernameCheck) {
            return res.status(200).json({ message: "The username you have chosen is already taken. Please choose a different username." });
        }

        bcrypt.hash(password, saltRounds, async (err, hash) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Please try again later." });
            }
            else {
                const newUser = new User({
                    email: email,
                    password: hash,
                    username: username
                });
                await newUser.save();
                req.login(newUser, (err) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).json({ message: "Please try again later." });
                    }
                    else {
                        return res.status(200).json({ message: "success" });
                    }
                });
            }
        })
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Please try again later." });
    }
});

app.post('/login', function (req, res, next) {
    passport.authenticate('local', { failureMessage: true }, function (err, user, info) {
        if (err) { return next(err); }
        if (!user) {
            return res.status(200).json({ message: info.message });
        }
        req.login(user, (err) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Please try again later." });
            }
            else {
                return res.status(200).json({ message: "success" });
            }
        })
    })(req, res, next);
});

app.get('/isAuthenticated', (req, res) => {
    if (req.isAuthenticated()) {
        const user = {
            id: req.user._id,
            email: req.user.email,
            username: req.user.username,
            avatarURL: req.user.avatarURL,
            followingCommunityIDs: req.user.communityIDs,
            participatingEventIds: req.user.participatingEventIds,
            likedPosts: req.user.likedPosts,
        };
        return res.status(200).json({ message: true, user: user });
    }
    else {
        return res.status(200).json({ message: false });
    }

});

app.get('/isAuthenticatedChat', (req, res) => {
    if (req.isAuthenticated()) {
        const serverClient = connect(api_key, api_secret, app_id);
        const token = serverClient.createUserToken(req.user._id);
        const user = {
            id: req.user._id,
            email: req.user.email,
            token: token,
            username: req.user.username,
            avatarURL: req.user.avatarURL,
            followingCommunityIDs: req.user.communityIDs,
            participatingEventIds: req.user.participatingEventIds,
            likedPosts: req.user.likedPosts
        };
        return res.status(200).json({ message: true, user: user });
    }
    else {
        return res.status(200).json({ message: false });
    }

});

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ message: "Please try again later." });
        }
        else {
            return res.status(200).json({ message: true });
        }
    });
})

app.post('/createCommunity', async (req, res) => {
    const userID = req.user._id;
    const name = req.body.name;
    const description = req.body.description;
    const logoURL = req.body.logoURL;
    const bannerURL = req.body.bannerURL;
    // const bannerURL = uploadImage(banner);
    // const logoURL = uploadImage(logo);

    try {
        const nameCheck = await Community.findOne({ name: name });
        if (nameCheck) {
            return res.status(200).json({ message: "A community with this name already exists. Please use a different name." });
        }

        const followingUserIDs = [userID];

        const newCommunity = new Community({
            name: name,
            description: description,
            logoURL: logoURL,
            bannerURL: bannerURL,
            adminId: userID,
            followingUserIDs: followingUserIDs
        });

        await newCommunity.save();

        // const user = await User.findById(userID);

        // const communityIDs = user.communityIDs;
        // communityIDs.push(newCommunity._id);

        const updatedUser = await User.findByIdAndUpdate(userID,
            { $push: { communityIDs: newCommunity._id } },
            { new: true });


        if (req.user && req.user._id === userID) {
            req.user.communityIDs = updatedUser.communityIDs;
        }
        const user = {
            id: req.user._id,
            email: req.user.email,
            username: req.user.username,
            avatarURL: req.user.avatarURL,
            followingCommunityIDs: req.user.communityIDs,
            participatingEventIds: req.user.participatingEventIds,
            likedPosts: req.user.likedPosts
        };
        return res.status(200).json({ message: 'success', user: user });

    }

    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
});

app.post('/followingCommunityDetails', async (req, res) => {
    const userID = req.body.id;
    try {
        const user = await User.findById(userID).select('communityIDs').populate('communityIDs').exec();
        if (!user) {
            throw new Error('User not found');
        }
        return res.status(200).json({ communities: user.communityIDs });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Please try again later." });
    }


});

app.get('/community/:communityId', async (req, res) => {
    const communityId = req.params.communityId;

    try {
        const community = await Community.findById(communityId).populate('followingUserIDs');
        if (!community) {
            return res.status(200).json({ message: 'Community not found' });
        }
        const posts = await Posts.find({ communityId }).populate('userId', '_id username avatarURL').sort({ createdAt: -1 });
        const events = await Events.find({ communityId }).sort({ createdAt: -1 });
        const items = await Item.find({ communityId }).sort({ createdAt: -1 });
        const data = {
            communityId: community._id,
            bannerURL: community.bannerURL,
            logoURL: community.logoURL,
            name: community.name,
            description: community.description,
            adminId: community.adminId,
            followingUsers: community.followingUserIDs,
            createdAt: community.createdAt.toLocaleDateString(),
            posts: posts,
            events: events,
            merchantIds: community.merchantIds,
            items: items
        }
        return res.status(200).json({ data });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
})

app.post('/joinCommunity', async (req, res) => {
    const userID = req.user._id;
    const communityId = req.body.communityId;
    try {
        const updatedUser = await User.findByIdAndUpdate(userID,
            { $push: { communityIDs: communityId } },
            { new: true });

        if (req.user && req.user._id === userID) {
            req.user.communityIDs = updatedUser.communityIDs;
        }


        const updatedCommunity = await Community.findByIdAndUpdate(communityId,
            { $push: { followingUserIDs: userID } },
            { new: true }
        );

        const user = {
            id: req.user._id,
            email: req.user.email,
            username: req.user.username,
            avatarURL: req.user.avatarURL,
            followingCommunityIDs: req.user.communityIDs,
            participatingEventIds: req.user.participatingEventIds,
            likedPosts: req.user.likedPosts
        };
        return res.status(200).json({ message: 'success', user: user });

    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
});

app.post('/leaveCommunity', async (req, res) => {
    const userID = req.user._id;
    const communityId = req.body.communityId;
    try {
        const updatedUser = await User.findByIdAndUpdate(userID,
            { $pull: { communityIDs: communityId } },
            { new: true });

        if (req.user && req.user._id === userID) {
            req.user.communityIDs = updatedUser.communityIDs;
        }


        const updatedCommunity = await Community.findByIdAndUpdate(communityId,
            { $pull: { followingUserIDs: userID } },
            { new: true }
        );

        const user = {
            id: req.user._id,
            email: req.user.email,
            username: req.user.username,
            avatarURL: req.user.avatarURL,
            followingCommunityIDs: req.user.communityIDs,
            participatingEventIds: req.user.participatingEventIds,
            likedPosts: req.user.likedPosts
        };
        return res.status(200).json({ message: 'success', user: user });

    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
});

app.get('/search', async (req, res) => {
    const query = req.query.q;
    var i = 0;
    try {
        const result = await Community.find({ name: { $regex: query, $options: 'i' } });
        res.status(200).json({ result: result });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
});

app.post('/createPost', async (req, res) => {
    const userId = req.user._id;
    const title = req.body.title;
    const body = req.body.body;
    const communityId = req.body.communityId;
    const attachmentURL = req.body.attachmentURL

    const post = {
        title: title,
        communityId: communityId,
        userId: userId,
        body: body
    };

    if (attachmentURL) {
        post.attachmentURL = attachmentURL;
    }

    try {
        const newPost = new Posts(post);
        await newPost.save();
        return res.status(200).json({ message: 'success' });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }

})

app.get('/home', async (req, res) => {
    const userId = req.user._id;
    const communityIds = req.user.communityIDs;
    try {
        // const posts = await Posts.aggregate([
        //     { $match: { communityId: { $in: communityIds } } },
        //     { $sort: { createdAt: -1 } }
        // ]).catch(err => console.error(err));
        const posts = await Posts.find({ communityId: { $in: communityIds } }).populate('userId', '_id username avatarURL').sort({ createdAt: -1 });

        console.log(posts);
        return res.status(200).json({ posts: posts });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
})

app.post('/likePost', async (req, res) => {
    const userId = req.user._id;
    const postId = req.body.postId;

    try {
        const updatedPost = await Posts.findByIdAndUpdate(postId,
            { $push: { likedUserIds: userId } },
            { new: true }
        );

        const updatedUser = await User.findByIdAndUpdate(userId,
            { $push: { likedPosts: postId } },
            { new: true }
        );
        if (req.user && req.user._id === userId) {
            req.user.likedPosts = updatedUser.likedPosts;
        }
        const user = {
            id: req.user._id,
            email: req.user.email,
            username: req.user.username,
            avatarURL: req.user.avatarURL,
            followingCommunityIDs: req.user.communityIDs,
            participatingEventIds: req.user.participatingEventIds,
            likedPosts: req.user.likedPosts
        };
        return res.status(200).json({ message: 'success', user: user });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
});

app.post('/unlikePost', async (req, res) => {
    const userId = req.user._id;
    const postId = req.body.postId;

    try {
        const updatedPost = await Posts.findByIdAndUpdate(postId,
            { $pull: { likedUserIds: userId } },
            { new: true }
        );

        const updatedUser = await User.findByIdAndUpdate(userId,
            { $pull: { likedPosts: postId } },
            { new: true }
        );
        if (req.user && req.user._id === userId) {
            req.user.likedPosts = updatedUser.likedPosts;
        }
        const user = {
            id: req.user._id,
            email: req.user.email,
            username: req.user.username,
            avatarURL: req.user.avatarURL,
            followingCommunityIDs: req.user.communityIDs,
            participatingEventIds: req.user.participatingEventIds,
            likedPosts: req.user.likedPosts
        };
        return res.status(200).json({ message: 'success', user: user });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
});

app.get('/postLikes', async (req, res) => {
    const postId = req.query.postId;
    console.log('hi');
    try {
        const post = await Posts.findById(postId);
        return res.status(200).json({ message: 'success', likedUserIds: post.likedUserIds });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
})

app.get('/post', async (req, res) => {
    const postId = req.query.postId;
    const pId = new mongoose.Types.ObjectId(postId);
    console.log(pId);
    try {
        const post = await Posts.findById(postId).populate({
            path: 'commentIds',
            populate: {
                path: 'userId',
                select: '_id username avatarURL'
            }
        })
            .populate("userId", "_id username avatarURL")
            .populate("communityId", "_id name logoURL");
        if (post.commentIds.length > 0) {
            post.commentIds.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        // const post = await Posts.aggregate([
        //     { $match: { _id: pId } },
        //     { $unwind: "$commentIds" },
        //     {
        //         $lookup: {
        //             from: "comments",
        //             localField: "commentIds",
        //             foreignField: "_id",
        //             as: "commentDetails"
        //         }
        //     },
        //     { $unwind: "$commentDetails" },
        //     { $sort: { "commentDetails.createdAt": -1 } },
        //     {
        //         $group: {
        //             _id: "$_id",
        //             title: { $first: "$title" },
        //             communityId: { $first: "$communityId" },
        //             userId: { $first: "$userId" },
        //             body: { $first: "$body" },
        //             attachmentURL: { $first: "$attachmentURL" },
        //             numLikes: { $first: "$numLikes" },
        //             numComments: { $first: "$numComments" },
        //             likedUserIds: { $first: "$likedUserIds" },
        //             comments: { $push: "$commentDetails" }
        //         }
        //     }
        // ]);
        console.log(post);
        return res.status(200).json({ message: 'success', post: post });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
});

app.post('/createComment', async (req, res) => {
    const postId = req.body.postId;
    const text = req.body.text;
    const userId = req.user._id;

    try {
        const newComment = new Comments({
            userId: userId,
            postId: postId,
            text: text
        });
        await newComment.save();

        const post = await Posts.findByIdAndUpdate(postId,
            { $push: { commentIds: newComment._id } },
            { new: true }
        );

        const opId = post.userId;

        const newNotification = new Notifications({
            userId: opId,
            postId: postId,
            merchantId: userId,
            type: "Comment"
        });

        await newNotification.save();

        return res.status(200).json({ message: 'success' });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }

});

app.post('/createEvent', async (req, res) => {
    const communityId = req.body.communityId;
    const title = req.body.title;
    const description = req.body.description;
    const eventDate = req.body.eventDate;
    const lastDate = req.body.lastDate;
    const attachmentURL = req.body.attachmentURL;
    console.log(req.body);

    const event = {
        userId: req.user._id,
        title: title,
        description: description,
        communityId: communityId,
        eventDate: eventDate,
        lastDate: lastDate
    };

    if (attachmentURL) {
        event.attachmentURL = attachmentURL;
    }

    try {
        const newEvent = new Events(event);
        await newEvent.save();
        return res.status(200).json({ message: 'success' });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }

});

app.post('/likeEvent', async (req, res) => {
    const userId = req.user._id;
    const eventId = req.body.eventId;

    try {
        const updatedEvent = await Events.findByIdAndUpdate(eventId,
            { $push: { likedUserIds: userId } },
            { new: true }
        );
        console.log(updatedEvent);
        return res.status(200).json({ message: 'success' });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
});

app.post('/unlikeEvent', async (req, res) => {
    const userId = req.user._id;
    const eventId = req.body.eventId;

    try {
        const updatedEvent = await Events.findByIdAndUpdate(eventId,
            { $pull: { likedUserIds: userId } },
            { new: true }
        );
        console.log(updatedEvent);
        return res.status(200).json({ message: 'success' });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
});


app.get('/event', async (req, res) => {
    const eventId = req.query.eventId;

    try {
        const event = await Events.findById(eventId).populate('participatingUserids').populate('communityId', '_id logoURL name adminId');
        return res.status(200).json({ message: 'success', event: event });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }

});

app.post('/registerEvent', async (req, res) => {
    const eventId = req.body.eventId;
    const userId = req.user._id;
    console.log(eventId);
    try {
        const updatedEvent = await Events.findByIdAndUpdate(eventId,
            { $push: { participatingUserids: userId } },
            { new: true }
        );

        const updatedUser = await User.findByIdAndUpdate(userId,
            { $push: { participatingEventIds: eventId } },
            { new: true }
        )
        if (req.user && req.user._id === userId) {
            req.user.participatingEventIds = updatedUser.participatingEventIds;
        }
        const user = {
            id: req.user._id,
            email: req.user.email,
            username: req.user.username,
            avatarURL: req.user.avatarURL,
            followingCommunityIDs: req.user.communityIDs,
            participatingEventIds: req.user.participatingEventIds,
            likedPosts: req.user.likedPosts
        };
        console.log(user);

        return res.status(200).json({ message: 'success', user: user });


    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
});

app.get('/eventParticipants', async (req, res) => {
    const eventId = req.query.eventId;
    try {
        const event = await Events.findById(eventId);
        return res.status(200).json({ message: 'success', data: event.participatingUserids });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
});

app.get('/notifications', async (req, res) => {
    if (req.isAuthenticated()) {
        const userId = req.user._id;
        try {
            const notifications = await Notifications.find({ userId: userId }).populate("merchantId", "_id username avatarURL").populate("communityId", "_id name").sort({ createdAt: -1 });
            console.log("Notifications");
            console.log(notifications);
            return res.status(200).json({ message: 'success', notifications: notifications });
        }
        catch (e) {
            console.log(e);
            return res.status(500).json({ message: "Please try again later." });
        }
    }
    else {
        return res.status(200).json({ message: 'session expired' });
    }

});

app.post('/deleteNotification', async (req, res) => {
    const notificationId = req.body.notificationId;

    try {
        await Notifications.findByIdAndDelete(notificationId);
        return res.status(200).json({ message: 'success' });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
});

app.post('/request', async (req, res) => {
    const communityId = req.body.communityId;
    const userId = req.user._id;

    console.log(communityId);
    console.log(req.body);

    try {
        const community = await Community.findById(communityId);

        const newNotification = new Notifications({
            userId: community.adminId,
            communityId: communityId,
            merchantId: userId,
            type: "Request",
            status: "Pending"
        });
        await newNotification.save();
        return res.status(200).json({ message: 'success' });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
});


app.get('/requestStatus', async (req, res) => {
    const communityId = req.query.communityId;
    const userId = req.user._id;

    try {
        const notification = await Notifications.findOne({ communityId: communityId, merchantId: userId, type: "Request" });
        console.log(notification);
        if (!notification) {
            return res.status(200).json({ status: "Not sent" });
        }
        else {
            return res.status(200).json({ status: notification.status });
        }
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
});

app.post('/acceptRequest', async (req, res) => {
    const notificationId = req.body.notificationId;
    const userId = req.user._id;
    try {
        const notification = await Notifications.findByIdAndUpdate(notificationId,
            { status: "Accepted" },
            { new: true }
        );

        const updateCommunity = await Community.findByIdAndUpdate(notification.communityId,
            { $push: { merchantIds: notification.merchantId } },
            { new: true }
        );
        return res.status(200).json({ message: "success" });

    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
});

app.post('/createItem', async (req, res) => {

    console.log(req.body);

    const name = req.body.name;
    const description = req.body.description;
    const communityId = req.body.communityId;
    const price = req.body.price;
    const attachmentURL = req.body.attachmentURL;
    const userId = req.user._id;

    try {
        const newItem = new Item({
            name: name,
            description: description,
            communityId: communityId,
            price: price,
            attachmentURL: attachmentURL,
            merchantId: userId
        });
        await newItem.save();
        return res.status(200).json({ message: "success" });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }


});

app.post('/editAvatar', async (req, res) => {
    const newAvatarURL = req.body.avatarURL;
    const userId = req.user._id;
    try {
        const updatedUser = await User.findByIdAndUpdate(userId,
            {
                avatarURL: newAvatarURL
            },
            { new: true }
        );
        if (req.user && req.user._id === userId) {
            req.user.avatarURL = updatedUser.avatarURL;
        }
        const user = {
            id: req.user._id,
            email: req.user.email,
            username: req.user.username,
            avatarURL: req.user.avatarURL,
            followingCommunityIDs: req.user.communityIDs,
            participatingEventIds: req.user.participatingEventIds,
            likedPosts: req.user.likedPosts
        };
        return res.status(200).json({ message: 'success', user: user });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
});

app.get('/profile', async (req, res) => {
    const userId = req.query.userId;
    console.log(userId);
    try {
        const user = await User.findById(userId).populate('communityIDs');
        console.log(user);
        const data = {
            id: user._id,
            username: user.username,
            avatarURL: user.avatarURL,
            email: user.email,
            communities: user.communityIDs
        };
        return res.status(200).json({ message: 'success', data: data });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Please try again later." });
    }
})


// passport local strategy

passport.use(new Strategy(async function verify(username, password, cb) {
    try {
        const user = await User.findOne({ email: username });
        if (!user) {
            return cb(null, false, { message: "No account found with this email address. Please check the email or register for a new account." });
        }

        bcrypt.compare(password, user.password, (err, success) => {
            if (err) {
                console.log(err);
                return cb(err);
            }
            else {
                if (success) {
                    return cb(null, user);
                }
                else {
                    return cb(null, false, { message: "The password you entered is incorrect. Please try again." });
                }
            }
        });
    }
    catch (err) {
        console.log(err);
        return cb(err);
    }
}));

passport.serializeUser((user, cb) => {
    cb(null, user);
});

passport.deserializeUser((user, cb) => {
    cb(null, user);
});


app.listen(port, () => {
    console.log(`Server running of port ${port}`);
});