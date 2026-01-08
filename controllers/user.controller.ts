require('dotenv');
import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/cacthAsyncErrors";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs"
import path from "path"
import sendMail from "../utils/sendMail";
import { accessTokenOptions, refreshTokenOptions, sendToken } from "../utils/jwt";
import { json } from "stream/consumers";
import { getAllUsersService, getUserById, UpdateUserRoleService } from "../services/user.service";
import cloudinary from "cloudinary";
import { v4 as uuidv4 } from 'uuid';


// register user 
interface IRegistrationBody {
    name: string;
    email: string;
    password: string;
    avatar?: string;

}

interface IForgotBody {

    email: string;

}

export const registrationUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password } = req.body;
        const isEmailExist = await userModel.findOne({ email });
        if (isEmailExist) {
            return next(new ErrorHandler("Email already exist", 400))
        }
        const user: IRegistrationBody = {
            name,
            email,
            password
        }
        const activationToken = createActivationToken(user);
        // jwt create code activation

        const activationCode = activationToken.activationCode;
        const data = {
            user: {
                name: user.name,

            },
            activationCode
        }
        const html = await ejs.renderFile(path.join(__dirname, "../mails/activation-mail.ejs"), data)
        try {
            sendMail({
                email: user.email,
                subject: "Activation account",
                template: "activation-mail.ejs",
                data
            });
            res.status(201).json({
                succues: true,
                message: `Please check your email: ${user.email} to activate your account!`,
                activationToken: activationToken.token
            })
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400))

        }

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

export const forgotPassword = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;

        const user: IForgotBody = {
            email,
        }
        const isEmailExist = await userModel.findOne({ email });
        if (!isEmailExist) {
            return next(new ErrorHandler("Account doesn't exist", 400))
        }
        // jwt create code activation
        const activationToken = createActivationToken(user);

        const activationCode = activationToken.activationCode;
        const data = {
            user: {
                email: user.email,

            },
            activationCode
        }
        const html = await ejs.renderFile(path.join(__dirname, "../mails/forgot-mail.ejs"), data)
        try {
            sendMail({
                email: user.email,
                subject: "Activation account",
                template: "forgot-mail.ejs",
                data
            });
            res.status(201).json({
                succues: true,
                message: `Please check your email: ${user.email} to reset your password!`,
                activationToken: activationToken.token,
                activationCode
            })
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400))

        }

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

interface IForgotPasswordRequest {
    activation_token: string;
    activation_code: string;
    newPassword: string;
}

export const verifyForgotPassword = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { activation_token, activation_code, newPassword } = req.body as IForgotPasswordRequest;
        // using jwt to verify and get activation code 
        const newUser: { user: IUser; activationCode: string } = jwt.verify(
            activation_token,
            process.env.ACTIVATION_SECRET as string
        ) as { user: IUser; activationCode: string };

        if (newUser.activationCode !== activation_code) {
            return next(new ErrorHandler("Invalid activation code", 400));

        }
        const { email } = newUser.user;

        const existUser = await userModel.findOne({ email }).select("+password");

        if (existUser) {
            const isPasswordMatch = await existUser.comparePassword(newPassword);
            if (isPasswordMatch) {

                return next(new ErrorHandler("New password mustn't match with old password", 400));
            }
            existUser.password = newPassword;
            await existUser.save();

        }

        res.status(201).json({
            existUser,
            success: true
        })



    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});


interface IActivationToken {
    token: string;
    activationCode: string;
}
export const createActivationToken = (user: any): IActivationToken => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const token = jwt.sign({
        user,
        activationCode,
    }, process.env.ACTIVATION_SECRET as Secret
        , {
            expiresIn: "5m"
        });
    return { token, activationCode }
}



// activate   user
interface IActivationRequest {
    activation_token: string;
    activation_code: string
}

export const activateUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { activation_token, activation_code } = req.body as IActivationRequest;
        // using jwt to verify and get activation code 
        const newUser: { user: IUser; activationCode: string } = jwt.verify(
            activation_token,
            process.env.ACTIVATION_SECRET as string
        ) as { user: IUser; activationCode: string };

        if (newUser.activationCode !== activation_code) {
            return next(new ErrorHandler("Invalid activation code", 400));


        }
        const { name, email, password } = newUser.user;

        const existUser = await userModel.findOne({ email });

        if (existUser) {
            return next(new ErrorHandler("User already exist", 400));

        }
        const user = await userModel.create({
            name,
            email,
            password,
        });
        
        res.status(201).json({
            user,
            success: true
        })



    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});


// login user
interface ILoginRequest {
    email: string;
    password: string

}


export const loginUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body as ILoginRequest;
        console.log(email);
        if (!email || !password) {
            return next(new ErrorHandler("Please provide email and password", 400));
        }

        const user = await userModel.findOne({ email }).select("+password");
        // const user = await userModel.findOne({ email });
        console.log(user);

        if (!user) {
            return next(new ErrorHandler("Invalid email or password", 400));
        }

        // Check if user has a password (not social auth user)
        if (!user.password) {
            return next(new ErrorHandler("This account was created with social login. Please use social login instead.", 400));
        }

        // if(password == user.password){
        //     sendToken(user, 200, res);

        // };

        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return next(new ErrorHandler("Invalid email or password", 400));
        }
        sendToken(user, 200, res);

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});

export const logoutUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.cookie("access_token", "", { maxAge: 1 });
        res.cookie("refresh_token", "", { maxAge: 1 });
        const userId = req.user?._id || "";
        console.log('user id', req.user);
        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});


// update access token
export const updateAccessToken = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refresh_token = req.cookies.refresh_token as string;
        const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as string) as JwtPayload;
        const message = 'Could not refresh token';
        if (!decoded) {
            return next(new ErrorHandler(message, 400));
        }
        const user = await userModel.findById(decoded.id as string);
        if (!user) {
            return next(new ErrorHandler("Please login for access this resource", 400));
        }

        const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN as string, {
            expiresIn: "5m"
        });
        const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN as string, {
            expiresIn: "3d"
        });
        req.user = user as any;

        res.cookie("access_token", accessToken, accessTokenOptions);
        res.cookie("refresh_token", refreshToken, refreshTokenOptions);


        // res.status(200).json({
        //     status: "success",
        //     accessToken,
        //     refreshToken
        // })
        next();



    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});


export const getUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id;
        getUserById(userId, res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
});
interface ISocialAuthBody {
    email: string;
    name: string;
    avatar: string;
    provider: string;

}

export const socialAuth = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, name, avatar, provider } = req.body as ISocialAuthBody;


        const user = await userModel.findOne({ email });

        if (!user) {
            if (typeof avatar === 'string') {
                let newavatar = {
                    public_id: uuidv4(),  // Generate ID ngẫu nhiên
                    url: avatar    // Gán chuỗi avatar vào thuộc tính url
                };
                console.log('check avatar', avatar)

                console.log('check avatar', newavatar)
                const newUser = await userModel.create({ email, name, avatar: newavatar, loginMethod: provider, });
                sendToken(newUser, 200, res);
            }
            const newUser = await userModel.create({ email, name, avatar });
            sendToken(newUser, 200, res);
        } else {
            sendToken(user, 200, res);

        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});

interface IUpdateUserInfo {
    name?: string;
    email?: string;
}

export const updateUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email } = req.body as IUpdateUserInfo;
        const userId = req.user?._id;
        const user = await userModel.findByIdAndUpdate(userId);
        if (email && user) {
            const isEmalExist = await userModel.findOne({ email });
            if (isEmalExist) {
                return next(new ErrorHandler('Email already exist', 400))

            };
            user.email = email;

        }
        if (name && user) {
            user.name = name;
        }
        await user?.save();
        res.status(200).json({ success: true, user });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});

// update user password
interface IUpdatePassword {
    oldPassword: string;
    newPassword: string;

}

export const updatePassword = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { oldPassword, newPassword } = req.body as IUpdatePassword;
        const userId = req.user?._id;
        const user = await userModel.findById(userId).select("+password");

        if (!oldPassword || !newPassword) {
            return next(new ErrorHandler('Please provide both old and new password', 400))
        }
        if (user?.password === undefined) {
            return next(new ErrorHandler("Invalid user", 400));
        }

        const isPasswordMatch = await user?.comparePassword(oldPassword);

        if (!isPasswordMatch) {
            return next(new ErrorHandler('Invalid password', 400));

        }
        user.password = newPassword;

        await user.save();


        res.status(201).json({
            success: true,
            user,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});

interface IUpdateProfilePicture {
    avatar: string;

}

export const updateProfilePicture = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { avatar } = req.body;

        const userId = req.user?._id;

        const user = await userModel.findById(userId);

        if (avatar && user) {
            // if user hafve one avatar then call this if 
            if (user?.avatar?.public_id) {
                // first delete the old image
                await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);

                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150,
                });
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url,

                }


            } else {
                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150,
                });
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url,
                }
            }
        }

        await user?.save();


        res.status(200).json({
            status: true,
            user
        })



    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});

// get all users --only for admin 

export const getAllUsers = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        try {
            getAllUsersService(res);
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400))
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});

// update user role -- only for admin 

export const updateUserRole = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        try {
            const { id, role } = req.body;
            UpdateUserRoleService(res, id, role);
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400))
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});

// delete user -- only for admin 

export const deleteUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const user = await userModel.findById(id);

        if (!user) {
            return next(new ErrorHandler("User not found", 404));
        }
        await user.deleteOne({ id });
        res.status(200).json({
            status: true,
            message: "User deleted successfully"
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});