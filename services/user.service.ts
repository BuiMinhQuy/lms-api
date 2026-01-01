import { Response } from "express";
import userModel from "../models/user.model"



export const getUserById = async (id: string, res: Response) => {
    const user = await userModel.findById(id);
    res.status(201).json({
        success: true,
        user
    })
}

//Get All users
export const getAllUsersService = async (res: Response) => {
    const users = await userModel.find().sort({ createdAt: -1 });
    res.status(201).json({
        success: true,
        users
    })
}

//Update role user
export const UpdateUserRoleService = async (res: Response, id: string, role: string) => {
    const users = await userModel.findByIdAndUpdate(id, { role }, { new: true });
    res.status(201).json({
        success: true,
        users
    })
}