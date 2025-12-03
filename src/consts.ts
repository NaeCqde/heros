import { type APIInteractionResponseCallbackData, MessageFlags } from 'discord-api-types/v10';

export const URL_PATTERN: RegExp = /https?:\/\/(?:[^ \n\t\.]+\.)+\w+\/[^ \n\t]+/g;

export const ERROR_MESSAGE: string = `エラーが発生しました`;
export const ERROR_RESPONSE = makeResponse(ERROR_MESSAGE);

export const BAD_REQUEST_MESSAGE: string = `提供されたリソースにアクセスできません`;
export const BAD_REQUEST_RESPONSE = makeResponse(BAD_REQUEST_MESSAGE);

export function makeResponse(content: string): APIInteractionResponseCallbackData {
    return {
        content,
        flags: MessageFlags.Ephemeral,
        allowed_mentions: {
            parse: [],
        },
    };
}
