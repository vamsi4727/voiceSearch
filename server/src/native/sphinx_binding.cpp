#ifdef _WIN32
  #define SPHINXBASE_EXPORT __declspec(dllimport)
  #define POCKETSPHINX_EXPORT __declspec(dllimport)
#endif

#include <napi.h>
#include <pocketsphinx.h>
#include <sphinxbase/err.h>
#include <sphinxbase/ad.h>

class SphinxRecognizer : public Napi::ObjectWrap<SphinxRecognizer> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    SphinxRecognizer(const Napi::CallbackInfo& info);
    ~SphinxRecognizer();

private:
    static Napi::FunctionReference constructor;
    ps_decoder_t* ps;
    ad_rec_t* ad;
    
    Napi::Value StartListening(const Napi::CallbackInfo& info);
    Napi::Value StopListening(const Napi::CallbackInfo& info);
    Napi::Value RecognizeFile(const Napi::CallbackInfo& info);
    
    void Cleanup();
};

Napi::FunctionReference SphinxRecognizer::constructor;

SphinxRecognizer::SphinxRecognizer(const Napi::CallbackInfo& info) 
    : Napi::ObjectWrap<SphinxRecognizer>(info) {
    Napi::Env env = info.Env();
    
    cmd_ln_t* config = cmd_ln_init(NULL, ps_args(), TRUE,
        "-hmm", MODELDIR,
        "-lm", LMFILE,
        "-dict", DICTFILE,
        "-samprate", "16000",
        "-nfft", "2048",
        "-beam", "1e-50",
        "-wbeam", "1e-40",
        "-maxhmmpf", "4000",
        "-maxwpf", "250",
        "-ds", "2",
        "-topn", "4",
        NULL);
    
    if (config == NULL) {
        Napi::Error::New(env, "Failed to create config").ThrowAsJavaScriptException();
        return;
    }

    printf("Initializing PocketSphinx with:\n");
    printf("Model dir: %s\n", cmd_ln_str_r(config, "-hmm"));
    printf("Dict file: %s\n", cmd_ln_str_r(config, "-dict"));
    printf("LM file: %s\n", cmd_ln_str_r(config, "-lm"));

    ps = ps_init(config);
    if (ps == NULL) {
        cmd_ln_free_r(config);
        Napi::Error::New(env, "Failed to initialize PocketSphinx").ThrowAsJavaScriptException();
        return;
    }

    ad = NULL;
}

SphinxRecognizer::~SphinxRecognizer() {
    Cleanup();
}

void SphinxRecognizer::Cleanup() {
    if (ad != NULL) {
        ad_close(ad);
        ad = NULL;
    }
    if (ps != NULL) {
        ps_free(ps);
        ps = NULL;
    }
}

Napi::Value SphinxRecognizer::StartListening(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (ad != NULL) {
        return Napi::Boolean::New(env, false);
    }

    ad = ad_open();
    if (ad == NULL) {
        Napi::Error::New(env, "Failed to open audio device").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    if (ad_start_rec(ad) < 0) {
        ad_close(ad);
        ad = NULL;
        Napi::Error::New(env, "Failed to start recording").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    if (ps_start_utt(ps, NULL) < 0) {
        ad_close(ad);
        ad = NULL;
        Napi::Error::New(env, "Failed to start utterance").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    return Napi::Boolean::New(env, true);
}

Napi::Value SphinxRecognizer::StopListening(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (ad == NULL) {
        return Napi::String::New(env, "");
    }

    ad_stop_rec(ad);
    ps_end_utt(ps);

    char const* hyp = ps_get_hyp(ps, NULL, NULL);
    std::string result = hyp ? hyp : "";

    ad_close(ad);
    ad = NULL;

    return Napi::String::New(env, result);
}

Napi::Value SphinxRecognizer::RecognizeFile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::Error::New(env, "File path argument required").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string audioPath = info[0].As<Napi::String>();
    printf("Processing audio file: %s\n", audioPath.c_str());

    FILE* fh = fopen(audioPath.c_str(), "rb");
    if (!fh) {
        printf("Failed to open audio file: %s\n", audioPath.c_str());
        Napi::Error::New(env, "Failed to open audio file").ThrowAsJavaScriptException();
        return env.Null();
    }

    ps_start_utt(ps, NULL);
    int16 buf[512];
    size_t nsamp;
    int total_samples = 0;
    
    while ((nsamp = fread(buf, 2, 512, fh)) > 0) {
        ps_process_raw(ps, buf, nsamp, FALSE, FALSE);
        total_samples += nsamp;
    }
    
    printf("Processed %d samples\n", total_samples);
    fclose(fh);
    ps_end_utt(ps);

    char const* hyp = ps_get_hyp(ps, NULL, NULL);
    std::string result = hyp ? hyp : "";
    printf("Recognition result: '%s'\n", result.c_str());

    return Napi::String::New(env, result);
}

Napi::Object SphinxRecognizer::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "SphinxRecognizer", {
        InstanceMethod("startListening", &SphinxRecognizer::StartListening),
        InstanceMethod("stopListening", &SphinxRecognizer::StopListening),
        InstanceMethod("recognizeFile", &SphinxRecognizer::RecognizeFile),
    });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("SphinxRecognizer", func);
    return exports;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    return SphinxRecognizer::Init(env, exports);
}

NODE_API_MODULE(sphinx_binding, Init) 