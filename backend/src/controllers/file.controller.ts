import { Request, Response } from 'express';
import { extractTextFromFile, combineFilesContext, SupportedFileType } from '../utils/file-extractor';
import { AppError, ValidationError } from '../utils/errors';

export class FileController {
    static async extractTextFromFiles(req: Request, res: Response): Promise<void> {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            throw new ValidationError('Nenhum arquivo enviado');
        }

        try {
            const extractedFiles = await Promise.all(
                (req.files as Express.Multer.File[]).map(async (file) => {
                    if (!Object.values(SupportedFileType).includes(file.mimetype as SupportedFileType)) {
                        if (file.mimetype.startsWith('text/')) {
                            return {
                                name: file.originalname,
                                content: extractTextFromFile(file.buffer, SupportedFileType.TXT)
                            };
                        }
                        throw new ValidationError(`Tipo de arquivo não suportado: ${file.mimetype} (${file.originalname})`);
                    }

                    const content = await extractTextFromFile(file.buffer, file.mimetype);
                    return {
                        name: file.originalname,
                        content,
                    };
                })
            );

            const resolvedFiles = await Promise.all(
                extractedFiles.map(async (f) => ({
                    name: f.name,
                    content: await f.content
                }))
            );

            const combinedText = combineFilesContext(resolvedFiles);

            res.json({
                success: true,
                data: {
                    text: combinedText,
                    files: resolvedFiles.map(f => ({ name: f.name, size: f.content.length }))
                }
            });
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            console.error('Erro ao processar arquivos:', error);
            throw new AppError(500, 'Falha ao processar arquivos enviados');
        }
    }
}
