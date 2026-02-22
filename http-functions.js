import { ok, notFound, badRequest } from 'wix-http-functions';
import wixSite from 'wix-site';
import { mediaManager } from 'wix-media-backend';

export async function get_files(request) {
    try {
        const filename = request.path[0];

        // Get the URL of the file in the Public folder
        const fileUrl = wixSite.getPublicFileUrl(filename);
        if (!fileUrl) {
            return notFound();
        }

        // Fetch the actual file content
        const fileResponse = await mediaManager.fetch(fileUrl);
        if (!fileResponse.ok) {
            return notFound();
        }

        const arrayBuffer = await fileResponse.arrayBuffer();
        const mimeType = fileResponse.headers.get("Content-Type") || "application/octet-stream";

        return ok({
            headers: {
                "Content-Type": mimeType
            },
            body: arrayBuffer
        });

    } catch (err) {
        return badRequest({
            headers: { "Content-Type": "application/json" },
            body: { error: err.message }
        });
    }
}

/*******************
 Example multiply endpoint
********************/

export function get_multiply(request) {

    const response = {
        "headers": {
            "Content-Type": "application/json"
        }
    }

    try {
        const leftOperand = parseInt(request.query["leftOperand"], 10);
        const rightOperand = parseInt(request.query["rightOperand"], 10);

        response.body = {
            "product": leftOperand * rightOperand
        }
        return ok(response);

    } catch (err) {
        response.body = {
            "error": err
        }
        return badRequest(response);
    }
}
