import cloudinary from 'cloudinary';
import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/cacthAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import LayoutModel from '../models/layout.model';

// create Layout
export const createLayout = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type } = req.body;
        const isTypeExist = await LayoutModel.findOne({ type });
        if (isTypeExist) {
            return next(new ErrorHandler(`${type} already exist`, 400));

        }
        if (type === "Banner") {
            const { image, title, subTitle } = req.body;
            const myCloud = await cloudinary.v2.uploader.upload(image, {
                folder: "Layout",

            });
            const banner = {
                type: "Banner",
                image: {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                },
                title,
                subTitle
            };
            await LayoutModel.create(banner);

        }
        if (type === "FAQ") {
            const { faq } = req.body;
            const faqItems = await Promise.all(
                faq.map(async (item: any) => {
                    // Handle both "question" and "questions" fields, and filter out undefined
                    const question = item.question || item.questions;
                    if (!question || !item.answer) {
                        return null; // Filter out invalid items
                    }
                    return {
                        question: question,
                        answer: item.answer
                    }
                })
            )
            // Filter out null values
            const validFaqItems = faqItems.filter(item => item !== null);
            console.log('faqItems',validFaqItems);
            await LayoutModel.create({ type: "FAQ", faq: validFaqItems });

        }
        if (type === "Categories") {
            const { categories } = req.body;
            const CategoriesItem = await LayoutModel.findOne({ type: "Categories" });

            const categoryItems = await Promise.all(
                categories.map(async (item: any) => {
                    return {
                        title: item.title
                    }
                })
            )
            await LayoutModel.create({ type: "Categories", categories: categoryItems });

        }
        res.status(200).json({
            success: true,
            message: "Layout created successfully"
        })




    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});


// edit Layout
export const editLayout = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type } = req.body;
        if (type === "Banner") {
            const bannerData: any = await LayoutModel.findOne({ type: "Banner" });
            console.log(bannerData);
            const { image, title, subTitle } = req.body;
            // console.log(image,title,subTitle);

            const data = image?.startsWith("http") ? bannerData : await cloudinary.v2.uploader.upload(image,{folder : "Layout"});
            if (bannerData) {
                await cloudinary.v2.uploader.destroy(bannerData.image.public_id);
                const banner = {
                    type :"Banner",
                    image: {
                        public_id: image.startsWith("http") ? bannerData.image.public_id : data.public_id,
                        url: image.startsWith("http") ? bannerData.image.url : data.secure_url
                    },
                    title,
                    subTitle
                };
                await LayoutModel.findByIdAndUpdate(bannerData.id, { banner });

            }
            console.log('data',data);
            // const myCloud = await cloudinary.v2.uploader.upload(image, {
            //     folder: "Layout",
            // });
            const banner = {
                type :"Banner",
                image: {
                    public_id: image.startsWith("http") ? bannerData.image.public_id : data.public_id,
                    url: image.startsWith("http") ? bannerData.image.url : data.secure_url
                },
                title,
                subTitle
            };
            await LayoutModel.create({type: "Banner",banner});

        }
        if (type === "FAQ") {
            const { faq } = req.body;
            const faqData = await LayoutModel.findOne({ type: "FAQ" });
            if (!faqData) {
                return next(new ErrorHandler("FAQ layout not found", 404));
            }
            const faqItems = await Promise.all(
                faq.map(async (item: any) => {
                    // Handle both "question" and "questions" fields, and filter out undefined
                    const question = item.question || item.questions;
                    if (!question || !item.answer) {
                        return null; // Filter out invalid items
                    }
                    return {
                        question: question,
                        answer: item.answer
                    }
                })
            )
            // Filter out null values
            const validFaqItems = faqItems.filter(item => item !== null);
            await LayoutModel.findByIdAndUpdate(faqData._id, { faq: validFaqItems });
        }
        if (type === "Categories") {
            const { categories } = req.body;
            const categoryData = await LayoutModel.findOne({ type: "Categories" });
              if (!categoryData) {
                return next(new ErrorHandler("Categories layout not found", 404));
            }
            const categoryItems = await Promise.all(
                categories.map(async (item: any) => {
                    return {
                        title: item.title
                    }
                })
            )
            await LayoutModel.findByIdAndUpdate(categoryData._id, { categories: categoryItems });
        }
        res.status(200).json({
            success: true,
            message: "Layout updated successfully"
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))

    }
});

// get layout by type 
export const getLayoutByType = CatchAsyncError(
    async(req:Request,res: Response, next:NextFunction)=>{
        try{
            const {type} = req.params;
            const layout = await LayoutModel.findOne({type});
            res.status(201).json({
                success:true,
                layout
            });

        }catch(error:any){
            return next(new ErrorHandler(error.message,500))
        }
    }
)