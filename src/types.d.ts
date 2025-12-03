export interface Video {
    thumbnail: string;
    src: string;
}
export type VideoNullable = Partial<Video>;

export type DiscordHonoBot = DiscordHono<
    {
        Bindings: Pick<Env, 'DB'>;
        Variables: Omit<Env, 'DB'>;
    },
    string
>;

export interface CommandSet {
    command: Command;
    register(bot: DiscordHonoBot): void;
    handler(ctx: CommandContext): Promise<Response>;
}

export interface EnvTypes {
    Bindings: Pick<Env, 'DB'>;
    Variables: Omit<Env, 'DB'>;
}
