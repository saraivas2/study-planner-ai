import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractedData {
  profile: {
    full_name?: string;
    institution?: string;
    enrollment_number?: string;
    course?: string;
    semester?: number;
    period_start?: string;
    period_end?: string;
  };
  subjects: Array<{
    code?: string;
    name: string;
    professor?: string;
    type?: string;
    class_group?: string;
    schedules?: Array<{
      day_of_week: number;
      start_time: string;
      end_time: string;
      location?: string;
    }>;
  }>;
}

interface EnrollmentUploadProps {
  onExtracted: (data: ExtractedData) => void;
  onProfileUpdate?: (profile: ExtractedData['profile']) => void;
}

export const EnrollmentUpload = ({ onExtracted, onProfileUpdate }: EnrollmentUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Formato inválido. Use PDF, PNG, JPG ou WEBP.');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 10MB.');
        return;
      }
      setFile(selectedFile);
      setStatus('idle');
      setExtractedData(null);
    }
  };

  const processFile = async () => {
    if (!file) return;

    setLoading(true);
    setStatus('uploading');
    setProgress(20);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);

      const fileBase64 = await base64Promise;
      setProgress(40);
      setStatus('processing');

      // Call edge function
      const { data, error } = await supabase.functions.invoke('extract-enrollment', {
        body: {
          fileBase64,
          mimeType: file.type
        }
      });

      setProgress(80);

      if (error) {
        throw new Error(error.message || 'Erro ao processar documento');
      }

      if (!data?.success || !data?.data) {
        throw new Error(data?.error || 'Falha na extração de dados');
      }

      setExtractedData(data.data);
      setStatus('success');
      setProgress(100);
      toast.success('Dados extraídos com sucesso!');
    } catch (error) {
      console.error('Error processing file:', error);
      setStatus('error');
      toast.error(error instanceof Error ? error.message : 'Erro ao processar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (extractedData) {
      if (onProfileUpdate && extractedData.profile) {
        onProfileUpdate(extractedData.profile);
      }
      onExtracted(extractedData);
      setFile(null);
      setExtractedData(null);
      setStatus('idle');
      setProgress(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Importar Atestado de Matrícula
        </CardTitle>
        <CardDescription>
          Faça upload do seu atestado em PDF ou imagem para extração automática via IA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!file ? (
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors"
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Clique para selecionar ou arraste o arquivo
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, PNG, JPG ou WEBP (máx. 10MB)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FileText className="w-8 h-8 text-accent" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {!loading && status !== 'success' && (
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                  Remover
                </Button>
              )}
            </div>

            {(loading || status === 'success') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {status === 'uploading' && 'Enviando arquivo...'}
                    {status === 'processing' && 'Processando com IA...'}
                    {status === 'success' && 'Extração concluída!'}
                    {status === 'error' && 'Erro no processamento'}
                  </span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {status === 'success' && extractedData && (
              <div className="space-y-3 p-4 bg-accent/10 rounded-lg border border-accent/30">
                <div className="flex items-center gap-2 text-accent">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Dados Extraídos</span>
                </div>
                
                <div className="text-sm space-y-1">
                  {extractedData.profile?.full_name && (
                    <p><strong>Nome:</strong> {extractedData.profile.full_name}</p>
                  )}
                  {extractedData.profile?.course && (
                    <p><strong>Curso:</strong> {extractedData.profile.course}</p>
                  )}
                  {extractedData.profile?.institution && (
                    <p><strong>Instituição:</strong> {extractedData.profile.institution}</p>
                  )}
                  <p><strong>Matérias encontradas:</strong> {extractedData.subjects?.length || 0}</p>
                </div>

                <Button onClick={handleConfirmImport} variant="accent" className="w-full">
                  Confirmar Importação
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">Falha na extração. Tente novamente ou adicione manualmente.</span>
              </div>
            )}

            {status === 'idle' && (
              <Button onClick={processFile} variant="accent" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Processar Documento
              </Button>
            )}

            {loading && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Analisando documento com IA...</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
