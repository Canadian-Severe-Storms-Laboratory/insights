import type { AxiosProgressEvent } from 'axios';
import axios from 'axios';
import {
    hc,
    type ClientResponse,
    type InferRequestType,
    type InferResponseType
} from 'hono/client';
import type { AppType } from '@insights/server';

export const client = hc<AppType>(window.location.origin);

export const $getAllPaths = client.api[360].paths.$get;
export type Paths = InferResponseType<typeof $getAllPaths>['paths'];
export type Path = Paths[number];

export const $getPathById = client.api[360].paths[':id'].$get;
export const $getPathByIdAll = client.api[360].paths[':id'].all.$get;
export type GetPathByIdAll = InferResponseType<typeof $getPathByIdAll>;

export const $getCapture = client.api[360].captures[':id'].$get;
export type Capture = Extract<InferResponseType<typeof $getCapture>, { capture: any }>['capture'];

export const $getPathStreetViewStatus = client.api[360].paths[':id'].status['street-view'].$get;

export const $createPath = client.api[360].paths.$post;
export type CreatePathInput = InferRequestType<typeof $createPath>['form'];
export type CreatePathOutput = InferResponseType<typeof $createPath>;

export const $getScanById = client.api.lidar.scans[':id'].$get;
export type Scan = Extract<InferResponseType<typeof $getScanById>, { scan: any }>['scan'];

export const $getAllScans = client.api.lidar.scans.$get;
export type Scans = InferResponseType<typeof $getAllScans>['scans'];

export const $createScan = client.api.lidar.scans.$post;
export type CreateScanInput = InferRequestType<typeof $createScan>['form'];
export type CreateScanOutput = InferResponseType<typeof $createScan>;

export const $getAllPads = client.api.hailgen.pads.$get;
export type Pads = InferResponseType<typeof $getAllPads>['pads'];

export const $getPadById = client.api.hailgen.pads[':id'].$get;
export type Pad = Extract<InferResponseType<typeof $getPadById>, { pad: any }>['pad'];

export const $getPadByIdAll = client.api.hailgen.pads[':id'].all.$get;
export type GetPadByIdAll = InferResponseType<typeof $getPadByIdAll>;

export const $createPad = client.api.hailgen.pads.$post;
export type CreatePadInput = InferRequestType<typeof $createPad>['form'];
export type CreatePadOutput = InferResponseType<typeof $createPad>;

export const $getPadDepthMapById = client.api.hailgen.pads[':id']['depth-map'].$get;
export type PadDepthMap = InferResponseType<typeof $getPadDepthMapById>;

export const $updatePadActionById = client.api.hailgen.pads[':id'].update.$post;
export type UpdatePadActionInput = InferRequestType<typeof $updatePadActionById>['form'];
export type UpdatePadActionOutput = InferResponseType<typeof $updatePadActionById>;

export const $getPadDentsByPadId = client.api.hailgen.pads[':id'].dents.$get;
export type Dents = Extract<InferResponseType<typeof $getPadDentsByPadId>, { dents: any }>['dents'];
export type Dent = Dents[number];

export function createAxiosPostFormHandler<
    TEndpoint extends {
        $post: (...args: any) => Promise<ClientResponse<any>>;
        $url: (...args: any) => { href: string };
    },
    TParams = InferRequestType<TEndpoint['$post']>['param']
>(
    endpoint: TEndpoint,
    {
        param,
        formData,
        signal,
        onUploadProgress
    }: {
        param: TParams;
        formData: FormData;
        signal?: AbortSignal;
        onUploadProgress?: (e: AxiosProgressEvent) => void;
    }
) {
    const url = endpoint.$url({ param }).href;
    return axios.postForm<InferResponseType<TEndpoint['$post']>>(url, formData, {
        signal,
        onUploadProgress
    });
}
