import { BadRequestException, Body, Controller, NotImplementedException, Post } from "@nestjs/common";
import { LoginDto } from "../dtos/input/login.dto";
import { AuthService } from "../services/auth.service";

@Controller("auth")
export class AuthController{

    constructor(private readonly authService: AuthService){}

    @Post("")
    async login(@Body() dto: LoginDto): Promise<{accessToken: string}>{
        return await this.authService.login(dto);
    }


}