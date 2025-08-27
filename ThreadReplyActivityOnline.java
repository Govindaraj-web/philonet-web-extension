package com.philonet.ai;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Rect;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.Spannable;
import android.text.SpannableString;
import android.text.SpannableStringBuilder;
import android.text.TextWatcher;
import android.text.style.BackgroundColorSpan;
import android.text.style.UnderlineSpan;
import android.util.AttributeSet;
import android.util.Log;
import android.view.ActionMode;
import android.view.HapticFeedbackConstants;
import android.view.KeyEvent;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.animation.BounceInterpolator;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.cardview.widget.CardView;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.GravityCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.widget.NestedScrollView;
import androidx.interpolator.view.animation.FastOutSlowInInterpolator;
import androidx.recyclerview.widget.ConcatAdapter;
import androidx.recyclerview.widget.ItemTouchHelper;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.facebook.shimmer.ShimmerFrameLayout;
import com.google.android.material.card.MaterialCardView;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.android.material.imageview.ShapeableImageView;
import com.google.android.material.snackbar.Snackbar;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;
import com.google.gson.Gson;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InterruptedIOException;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TimeZone;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import io.fabric.sdk.android.services.concurrency.AsyncTask;
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;
import io.reactivex.rxjava3.core.Single;
import io.reactivex.rxjava3.core.SingleObserver;
import io.reactivex.rxjava3.disposables.CompositeDisposable;
import io.reactivex.rxjava3.disposables.Disposable;
import io.reactivex.rxjava3.schedulers.Schedulers;
import io.socket.client.IO;
import io.socket.client.Socket;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class ThreadReplyActivityOnline extends AppCompatActivity implements ThreadRepliesAdapter.OnReactionDirectClickListener {
    private Socket socket;
    private LoadingDialog loadingDialog;
    private boolean isRequestInProgress = false;

    private Handler pillHandler = new Handler();
    private Runnable pillHideRunnable;

    private String currentEmotion;

    View emotionAccentLine;
    private static final int SCROLL_THRESHOLD = 20; // Minimum scroll distance to trigger
    private static final int HIDE_DELAY = 2000; // Hide button after 2 seconds of no scrolling
    private Handler scrollHandler = new Handler(Looper.getMainLooper());
    private Runnable hideButtonRunnable;
    private long lastScrollTime = 0;
    private boolean isButtonVisible = false;
    private boolean isInitialLoadComplete = false;
    private boolean hasLoadedRecentMessages = false;

    long thinkingTime,lastSeen;

    boolean isOnline=false;

    private String lastAfterCursor = null;
    private String lastBeforeCursor = null;

    private SocketManager socketManager;
    private boolean isActivityInForeground = false;


    private TextView drawerRoomName, starterLabel, starterName, memberCount;
    private ShapeableImageView starterAvatar;
    private RecyclerView membersRecyclerView;

    FloatingActionButton jumpToRecentButton;
    private ProgressBar loadMoreProgress;

//    LinearLayout maincontentconversation;

    private LinearLayout shimmerContainer;

    private ParticipantAdapter adapter;
    private List<Participant> participantsList = new ArrayList<>();

    private int page = 1;
    private boolean isLoading = false;
    private boolean hasNextPage = false;

    private final String API_URL = "https://api.typepilot.app/v1/room/conversation-people";


//    LinearLayout footermain;

//    LinearLayout openInClientContainer;
private RecyclerView messagesRecyclerView;
    private ThreadRepliesAdapter repliesAdapter;
    private ParentCardAdapter parentCardAdapter;
    private ConcatAdapter concatAdapter;

    private ImageButton inviteButton;

    ImageButton aibutton;
    private ModernAiAssistant aiAssistant;



    ShimmerFrameLayout shimmerFrameLayout,parentMessageShimmerLayout;

    private boolean needsToJoin = false;

    private long lastVisibleTimestamp = 0;
    private boolean isActivityVisible = false;
    private boolean needsNewerMessagesCheck = false;
    private Handler reconnectHandler;
    private Runnable reconnectRunnable;
    private String lastKnownNewestMessageId = "";


    MaterialCardView quoteCard;
    ImageView connector_line;

    String summarynew;

    TextView quote;

    String quotecontent;
    private boolean isPrivate = true;
    private String preservedMessage = "";

    private boolean isNightModeSwitchOn = false;

    private androidx.drawerlayout.widget.DrawerLayout drawerLayout;

    private int articleId;
    private int parentCommentId;
    boolean expandedmain = false;
    private NestedScrollView contentScrollView;
    private boolean isInFocusedMode = false;
    private boolean hasFocusedMoreBefore = false;
    private boolean hasFocusedMoreAfter = false;
    private int focusedOldestId = -1;
    private int focusedNewestId = -1;

    private boolean isSocketConnected = false;
    private static final int RECONNECTION_ATTEMPTS = 5;
    private static final int RECONNECTION_DELAY = 3000;
    private static final int CONNECTION_TIMEOUT = 10000;

    private View emptyStateView;
    private OkHttpClient httpClient;

    ConversationManager manager;
    private View loadingStateView;
    private View errorStateView;
    private MentionEditText messageInput;
    private String currentUserId;
    private static final int PAGE_SIZE = 50;
    private boolean isSending = false;
    private ImageButton sendButton;

    String commentuserid;
    private String access;
    private MediaPlayer messageSound;
    private final CompositeDisposable disposables = new CompositeDisposable();
    private String summary = "";
//    private NestedScrollView mainScrollView;
    private FloatingActionButton scrollToRecent;

    int people=0;
    private static final int SHOW_SCROLL_UP_THRESHOLD = 1000;
    private String message, pic, name, timestamp;

    private CommentsResponse currentPagination = new CommentsResponse();
    private int replies, reactions;
    private boolean isLoadingMoreItems = false;
    private String title;
    String categoryname;
    int roomId;
    // Parent message views
    private ShapeableImageView parentUserAvatar;
    private TextView parentUserName;
    private TextView parentPostTime;
    private TextView repliesCountText;
    private MaterialCardView parentReactionsContainer;
    private TextView parentReactionEmoji;
    private TextView parentReactionCount;
    private MaterialCardView parentRepliesContainer;

    public static final int RESULT_THREAD_UPDATED = 101;
    public static final String EXTRA_COMMENT_ID = "comment_id";
    public static final String EXTRA_REPLY_COUNT = "reply_count";
    public static final String EXTRA_RECENT_AVATARS = "recent_avatars";
    private View replyPreviewContainer;
    private TextView replyPreviewText;
    private TextView replyPreviewUsername;
    private TextView replyingToLabel;
    private ImageButton cancelReplyButton;
    private Opinion currentReplyingTo = null;

    private int focusComment = -1;
    private String description;
    private String currentLink;
    private boolean isInviteButtonVisible=true;
    private String imageUrl;
    private boolean foreground=false;
    private boolean firstdone=false;


    private boolean isUiSafe() {
        return !isFinishing() && !isDestroyed();
    }

    private void safeUiUpdate(Runnable uiOperation) {
        if (isUiSafe()) {
            try {
                uiOperation.run();
            } catch (Exception e) {
                Log.e("ThreadReply", "Error in UI update", e);
            }
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().requestFeature(Window.FEATURE_ACTIVITY_TRANSITIONS);
        Window window = this.getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(ContextCompat.getColor(this, R.color.my_statusbar_color));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setNavigationBarColor(ContextCompat.getColor(this, R.color.my_statusbar_color));
        }

        SharedPreferences prefs1 = getSharedPreferences("AppPrefs", MODE_PRIVATE);
        isNightModeSwitchOn = prefs1.getBoolean("night_mode", false);

        if (isNightTime() && isNightModeSwitchOn) {
            setContentView(R.layout.drawer_hotroom_dark_conversation);
        } else {
            setContentView(R.layout.drawer_hotroom_conversation);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController insetsController = getWindow().getInsetsController();
            if (insetsController != null) {
                insetsController.setSystemBarsAppearance(
                        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS |
                                WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS |
                                WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                );
            }
        }

// Step 4: Setup padding for system bars
        View rootView = findViewById(R.id.root);
        ViewCompat.setOnApplyWindowInsetsListener(rootView, (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars()|WindowInsetsCompat.Type.ime());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets; // ✅ Important: don’t consume the insets!
        });


        // Get data and preferences
        SharedPreferences prefs = getSharedPreferences("login", Context.MODE_PRIVATE);
        access = prefs.getString("access", "");
        currentUserId = prefs.getString("userid", "");
        title = getIntent().getStringExtra("title");
        articleId = getIntent().getIntExtra("articleId", 0);
        parentCommentId = getIntent().getIntExtra("commentId", 0);
        message = getIntent().getStringExtra("text");
        name = getIntent().getStringExtra("name");
        pic = getIntent().getStringExtra("pic");
        timestamp = getIntent().getStringExtra("timestamp");
        replies = getIntent().getIntExtra("replies", 0);
        people = getIntent().getIntExtra("thread_people_count",0);
        reactions = getIntent().getIntExtra("reactions", 0);
        categoryname = getIntent().getStringExtra("categoryName");
        focusComment = getIntent().getIntExtra("focuscomment",-1);
        quotecontent = getIntent().getStringExtra("quote"); // Add this if not already there

        // Check if required data is missing
        if (articleId == 0 || parentCommentId == 0) {
            Toast.makeText(this, "Invalid comment ID", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }



        setupStateViews();
        initViews();
        setupInitialUIWithIntentData(); // NEW METHOD - Show parent card immediately
        showLoadingStateForReplies(); // Only show loading for replies, not parent card
        isLoading = true;
        fetchArticleAndCommentDetails();
        HistoryManager.initialize(this);
        // Setup back button


         manager = new ConversationManager(articleId, parentCommentId, access);
         manager.updateLastActive();

        AnalyticsManager.initialize(this);
    }

    private void setupInitialUIWithIntentData() {
        // Create parent card data from Intent immediately
        ParentCardAdapter.ParentCardData initialParentData = createInitialParentCardData();

        // Initialize the UI components that don't require API data
        initializeViews();

        // Set up parent card with initial data
        if (initialParentData != null) {
            parentCardAdapter.setParentCardData(initialParentData);

            // Show parent card immediately
            if (parentMessageShimmerLayout != null) {
                parentMessageShimmerLayout.stopShimmer();
                parentMessageShimmerLayout.setVisibility(View.GONE);
            }
        }

        checkArticleAccess();
        messageInput.enableApiSearch(access, Integer.toString(roomId), Integer.toString(articleId));
    }


    private ParentCardAdapter.ParentCardData createInitialParentCardData() {
        // Process quote content from Intent
        String processedMessage = message;
        String processedQuote = quotecontent;

        // Extract quote from message if needed (your existing logic)
        if (message != null && message.trim().startsWith("\"") && (quotecontent == null || quotecontent.isEmpty())) {
            // Your existing quote extraction logic here
            String extractedQuote = extractQuoteFromMessage(message);
            if (extractedQuote != null) {
                processedQuote = extractedQuote;
                processedMessage = message.substring(message.indexOf('\n') + 1).trim();
            }
        }

        // Process reactions from Intent
        String userReaction = getIntent().getStringExtra("userReaction");
        String latestReactionType = getIntent().getStringExtra("latestReactionType");
        boolean userReacted = userReaction != null && !userReaction.isEmpty();

        String primaryReactionEmoji = "👍"; // default
        if (userReacted) {
            primaryReactionEmoji = getEmojiForReactionType(userReaction);
        } else if (reactions > 0 && latestReactionType != null) {
            primaryReactionEmoji = getEmojiForReactionType(latestReactionType);
        }

        return new ParentCardAdapter.ParentCardData(
                "", // currentLink - will be updated from API
                "", // description - will be updated from API
                "", // imageUrl - will be updated from API
                title != null ? title : "", // Article title
                processedMessage != null ? processedMessage : "", // Comment content
                name != null ? name : "", // User name
                pic != null ? pic : "", // User picture
                timestamp != null ? timestamp : "", // Formatted timestamp
                replies, // Reply count
                processedQuote, // Quote content
                reactions, // Reaction count
                userReaction, // User's reaction
                reactions > 0, // Has reactions
                primaryReactionEmoji, // Primary reaction emoji
                userReacted, // User reacted flag
                0, // thinkingTime - will be updated from API
                0, // lastSeen - will be updated from API
                false, // isOnline - will be updated from API
                currentUserId,
                String.valueOf(parentCommentId),
                "" // commentUserId - will be updated from API
        );
    }

    // NEW METHOD: Extract quote from message (your existing logic)
    private String extractQuoteFromMessage(String message) {
        if (message == null || !message.trim().startsWith("\"")) {
            return null;
        }

        int firstQuote = message.indexOf('"');
        int secondQuote = -1;
        int searchStart = firstQuote + 1;

        while (searchStart < message.length()) {
            int candidateQuote = message.indexOf('"', searchStart);
            if (candidateQuote == -1) {
                break;
            }

            boolean isFollowedByNewline = false;
            if (candidateQuote + 1 < message.length()) {
                char nextChar = message.charAt(candidateQuote + 1);
                if (nextChar == '\n' || nextChar == '\r') {
                    isFollowedByNewline = true;
                }
            } else {
                isFollowedByNewline = true;
            }

            if (isFollowedByNewline) {
                secondQuote = candidateQuote;
                break;
            }

            searchStart = candidateQuote + 1;
        }

        if (secondQuote != -1) {
            String extracted = message.substring(firstQuote + 1, secondQuote);
            return extracted;
        }

        return null;
    }

    // NEW METHOD: Show loading only for replies section
    private void showLoadingStateForReplies() {
//        if (shimmerFrameLayout != null) {
//            shimmerFrameLayout.setVisibility(View.VISIBLE);
//            shimmerFrameLayout.startShimmer();
//        }
//
//        // Keep parent card visible, only hide replies
//        if (messagesRecyclerView != null) {
//            messagesRecyclerView.setVisibility(View.GONE);
//        }

        if (emptyStateView != null) {
            emptyStateView.setVisibility(View.GONE);
        }

        if (errorStateView != null) {
            errorStateView.setVisibility(View.GONE);
        }
    }


    private void updateParentCardWithAPIData() {
        if (parentCardAdapter == null) return;

        // Create updated parent card data with API information
        ParentCardAdapter.ParentCardData updatedData = createParentCardData();

        if (updatedData != null) {
            parentCardAdapter.setParentCardData(updatedData);
            Log.d("ParentCard", "Updated parent card with API data");
        }
    }

    private void fetchArticleAndCommentDetails() {
        // Update token if needed
        ArticleCommentCache.getInstance().setAccessToken(access);

        // FIXED: Use the cache-first-then-update method
        ArticleCommentCache.getInstance().getArticleCommentDetailsWithUpdate(articleId, parentCommentId,
                new ArticleCommentCallback() {

                    private boolean initialLoadComplete = false;

                    @Override
                    public void onSuccess(JSONObject articleData, JSONObject commentData, boolean fromCache) {
                        // This runs on main thread
                        if (!isUiSafe()) return;

                        try {
                            // Use your existing parsing logic
                            parseCommentDetails(commentData, articleData);
                            silentlyJoinAsGuest();
                            initializeModernAiAssistant();

                            if (fromCache || !initialLoadComplete) {
                                // This is either cached data or the first network response

                                // Only dismiss loading dialog on first response (cached or initial network)
                                if (loadingDialog != null) {
                                    loadingDialog.dismiss();
                                    loadingDialog = null; // Prevent dismissing twice
                                }

                                // Continue with your existing flow
                                updateParentCardWithAPIData();

                                showContent();

                                // Handle scrolling on first load
                                if(focusComment > 0) {
                                    fetchAndScrollToComment(focusComment);
                                    focusComment = 0;
                                } else {
                                    loadReplies();
                                }

                                initialLoadComplete = true;

                            } else {
                                // This is a network update after cached data was already shown
                                // Re-parse the updated data (this is crucial!)
                                parseCommentDetails(commentData, articleData);
                                updateParentCardWithAPIData();

                                // Optionally show a subtle indicator that content was updated
                                // Toast.makeText(ThreadReplyActivityOnline.this, "Content updated", Toast.LENGTH_SHORT).show();

                                // Refresh replies to get any new comments
                                loadReplies();
                            }


                        } catch (Exception e) {
                            // Handle parsing errors
                            if (!initialLoadComplete && loadingDialog != null) {
                                loadingDialog.dismiss();
                                loadingDialog = null;
                            }

                            if (!initialLoadComplete) {
                                Toast.makeText(ThreadReplyActivityOnline.this,
                                        "Error parsing comment data: " + e.getMessage(),
                                        Toast.LENGTH_SHORT).show();
                                finish();
                            } else {
                                // If this was an update that failed, just log it
                                Log.e("ThreadReplyActivity", "Error parsing updated comment data", e);
                            }
                        }
                    }

                    @Override
                    public void onFailure(Exception error) {
                        // This runs on main thread
                        if (!isUiSafe()) return;

                        // Only show error and finish if this was the initial load
                        if (!initialLoadComplete) {
                            if (loadingDialog != null) {
                                loadingDialog.dismiss();
                            }

                            Toast.makeText(ThreadReplyActivityOnline.this,
                                    "Failed to load conversation: " + error.getMessage(),
                                    Toast.LENGTH_SHORT).show();
                            finish();
                        } else {
                            // If this was an update that failed, just log it
                            Log.e("ThreadReplyActivity", "Failed to update comment data", error);
                        }
                    }
                });
    }

    private ParentCardAdapter.ParentCardData createParentCardData() {
        // Process reactions
        String primaryReactionEmoji = "👍"; // default
        boolean hasReactions = reactions > 0;
        boolean userReacted = false;
        String userReaction = getIntent().getStringExtra("userReaction");

        if (userReaction != null && !userReaction.isEmpty()) {
            userReacted = true;
            primaryReactionEmoji = getEmojiForReactionType(userReaction);
        } else if (hasReactions) {
            // Use the latest reaction type from intent
            String latestReactionType = getIntent().getStringExtra("latestReactionType");
            if (latestReactionType != null) {
                primaryReactionEmoji = getEmojiForReactionType(latestReactionType);
            }
        }

        return new ParentCardAdapter.ParentCardData(
                currentLink,
                description,
                imageUrl,
                title,                    // Article title (if you want to show it)
                message,                  // Comment content
                name,                     // User name
                pic,                      // User picture
                timestamp,                // Formatted timestamp
                replies,                  // Reply count
                quotecontent,             // Quote content
                reactions,                // Reaction count
                userReaction,             // User's reaction
                hasReactions,             // Has reactions
                primaryReactionEmoji,     // Primary reaction emoji
                userReacted,               // User reacted flag
                thinkingTime,
                lastSeen,
                isOnline,
                currentUserId,
                String.valueOf(parentCommentId),
                String.valueOf(commentuserid)
        );
    }
    // Helper method to parse comment details from JSON response
    private void parseCommentDetails(JSONObject commentData, JSONObject articleData) throws JSONException {
        // Extract article information
        title = articleData.optString("title", "");
        description = articleData.optString("description","");
        currentLink = articleData.optString("url","");
        summarynew = articleData.optString("summary",description);
        categoryname = articleData.optString("category", "");
        roomId = articleData.optInt("room_id",-1);
        imageUrl = articleData.optString("thumbnail_url","");
        // Extract main comment details
        message = commentData.optString("content", "");
        quotecontent = commentData.optString("quote","");
        name = commentData.optString("user_name", "");
        pic = commentData.optString("user_picture", "");
        commentuserid = commentData.optString("user_id","");

        thinkingTime = articleData.optLong("thinking_time", 0L);
        if (articleData.has("presence")) {
            JSONObject presence = articleData.optJSONObject("presence");
            if (presence != null) {
                String presenceStatus = presence.optString("status", "offline");
                 isOnline = presence.optBoolean("isOnline", false);
                 lastSeen = presence.optLong("lastSeen", 0L);

                getIntent().putExtra("presenceStatus", presenceStatus);
                getIntent().putExtra("isOnline", isOnline);
                getIntent().putExtra("lastSeen", lastSeen);
            }
        }

        // Format timestamp
        String timestampStr = commentData.optString("created_at", "");
        timestamp = formatTimestamp(timestampStr);

        // Get reply and reaction counts
        replies = commentData.optInt("reply_count", 0);
        people = commentData.optInt("thread_people_count",0);
        reactions = commentData.optInt("reaction_count", 0);

        TextView peopleCount = findViewById(R.id.onlineCount);
        if (peopleCount != null) {
            peopleCount.setText(people + " in this conversation");
        }
        // Check if user has reacted to this comment
        boolean userReacted = commentData.optBoolean("user_reacted", false);
        String userReaction = commentData.optString("user_reaction_type", "");

        // Store user reaction information for later use
        getIntent().putExtra("userReaction", userReacted ? userReaction : "");

        // If there are reactions, get the most common one to display
        if (reactions > 0 && commentData.has("reactions")) {
            JSONArray reactionsArray = commentData.getJSONArray("reactions");
            if (reactionsArray.length() > 0) {
                JSONObject firstReaction = reactionsArray.getJSONObject(0);
                String latestReactionType = firstReaction.optString("reaction_type", "like");
                getIntent().putExtra("latestReactionType", latestReactionType);
            }
        }

        repliesAdapter.setCurrentLink(currentLink);
    }

    // Helper method for timestamp formatting
    private String formatTimestamp(String timestampStr) {
        try {
            // Parse the ISO 8601 timestamp
            SimpleDateFormat inputFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
            inputFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
            Date date = inputFormat.parse(timestampStr);

            long now = System.currentTimeMillis();
            long timestamp = date.getTime();
            long diff = now - timestamp;

            // Convert to seconds
            long seconds = diff / 1000;

            // Future timestamps
            if (seconds < 0) {
                return "in the future";
            }

            // Less than a minute
            if (seconds < 60) {
                return seconds <= 1 ? "just now" : seconds + " seconds ago";
            }

            // Minutes
            long minutes = seconds / 60;
            if (minutes < 60) {
                return minutes == 1 ? "1 minute ago" : minutes + " minutes ago";
            }

            // Hours
            long hours = minutes / 60;
            if (hours < 24) {
                return hours == 1 ? "1 hour ago" : hours + " hours ago";
            }

            // Days
            long days = hours / 24;
            if (days < 7) {
                return days == 1 ? "1 day ago" : days + " days ago";
            }

            // Weeks
            long weeks = days / 7;
            if (weeks < 4) {
                return weeks == 1 ? "1 week ago" : weeks + " weeks ago";
            }

            // Months (approximate)
            long months = days / 30;
            if (months < 12) {
                return months == 1 ? "1 month ago" : months + " months ago";
            }

            // Years
            long years = days / 365;
            if (years == 1) {
                return "1 year ago";
            } else if (years < 5) {
                return years + " years ago";
            }

            // For very old timestamps, fall back to date format
            SimpleDateFormat fallbackFormat = new SimpleDateFormat("MMM d, yyyy");
            return fallbackFormat.format(date);

        } catch (Exception e) {
            return "Unknown time";
        }
    }


    private void setupInitialViews() {
        AnalyticsManager.initialize(this);
        if (isFinishing() || isDestroyed()) {
            return;
        }
        // Set theme based on night mode
        SharedPreferences prefs1 = getSharedPreferences("AppPrefs", MODE_PRIVATE);
        isNightModeSwitchOn = prefs1.getBoolean("night_mode", false);

        // Initialize views and setup components
        initViews();
        setupStateViews();
        initializeViews();
//        setupScrollBehavior();
//        initializeScrollToTopFab();
        initializeSocketManager();
//        loadReplies();
//        footermain = findViewById(R.id.footermain);
//        footermain.setVisibility(View.VISIBLE);
        // Setup back button
        checkArticleAccess();
        messageInput.enableApiSearch(access,Integer.toString(roomId),Integer.toString(articleId));
    }

    private void initializeSocketManager() {
        if (socketManager != null) {
            socketManager.cleanup();
        }

        socketManager = new SocketManager(
                this,
                access, // your access token
                articleId,
                parentCommentId,
                new SocketManager.SocketEventListener() {
                    @Override
                    public void onConnected() {
                        Log.d("ThreadReply", "✅ Socket connected successfully");
                        // Update UI to show connected state
                        hideConnectionError();
                    }

                    @Override
                    public void onDisconnected(String reason) {
                        Log.d("ThreadReply", "❌ Socket disconnected: " + reason);
                        // Update UI to show disconnected state (optional)
                        showDisconnectedMessage();
                    }

                    @Override
                    public void onConnectionError(String error) {
                        Log.e("ThreadReply", "🔥 Connection error: " + error);
                        // Show error to user if needed
                        showConnectionError(error);
                    }

                    @Override
                    public void onNewMessage(Opinion message) {
                        if(!isActivityVisible){
                            foreground=true;
                        }
                        handleNewMessageFromSocket(message);
                    }

                    @Override
                    public void onMessageDeleted(String messageId) {
                        Log.d("ThreadReply", "🗑️ Message deleted: " + messageId);
                        handleMessageDeleted(messageId);
                    }

                    @Override
                    public void onReactionUpdated(String targetId, JSONObject reactionData) {
                        Log.d("ThreadReply", "👍 Reaction updated for: " + targetId);
                        handleReactionUpdated(targetId, reactionData);
                    }

                    @Override
                    public void onUserJoined(String userId, String userName) {
                        Log.d("ThreadReply", "👋 User joined: " + userName);
                        // Update participant count or show notification
                        updateParticipantCount(1);
                    }

                    @Override
                    public void onUserLeft(String userId) {
                        Log.d("ThreadReply", "👋 User left: " + userId);
                        // Update participant count
                        updateParticipantCount(-1);
                    }

                    @Override
                    public void onTypingStarted(String userId, String userName) {
                        Log.d("ThreadReply", "⌨️ " + userName + " is typing");
                        showTypingIndicator(userName);
                    }

                    @Override
                    public void onTypingStopped(String userId) {
                        Log.d("ThreadReply", "⌨️ Typing stopped: " + userId);
                        hideTypingIndicator(userId);
                    }

                    @Override
                    public void onRoomUpdated(JSONObject roomData) {
                        Log.d("ThreadReply", "🏠 Room updated");
                        // Handle room updates (title changes, settings, etc.)
                        handleRoomUpdate(roomData);
                    }
                }
        );

        // Start connection
        socketManager.connect();
    }


    private void handleNewMessageFromSocket(Opinion newMessage) {
        if (repliesAdapter == null) {
            Log.w("ThreadReply", "Adapter is null, cannot handle new message");
            return;
        }

        // Check if message already exists to prevent duplicates
        List<Opinion> currentList = new ArrayList<>(repliesAdapter.getCurrentList());
        for (Opinion existing : currentList) {
            if (existing.getId().equals(newMessage.getId())) {
                Log.d("ThreadReply", "Message already exists, skipping: " + newMessage.getId());
                return;
            }
        }

        // Don't add messages from current user (they're handled by optimistic updates)
        if (newMessage.getSenderId().equals(currentUserId)) {
            Log.d("ThreadReply", "Skipping own message from socket: " + newMessage.getId());
            return;
        }

        // Add new message to list
        currentList.add(newMessage);
        repliesAdapter.submitList(currentList, () -> {
            // Auto-scroll if user is near bottom
            autoScrollToNewMessage();

            // Play notification sound
            playMessageSound(R.raw.sent);

            // Update replies count
            updateRepliesCount(1);

            // Show new message notification if app is in background
        });

        // Update socket manager's message tracking
        socketManager.setLastMessageInfo(newMessage.getId(), newMessage.getTimestamp());
    }

    /**
     * ENHANCED: Handle message deletion from socket
     */
    private void handleMessageDeleted(String messageId) {
        if (repliesAdapter != null) {
            boolean wasUpdated = repliesAdapter.markCommentAsDeleted(
                    messageId,
                    "This message was deleted",
                    ""
            );

            if (wasUpdated) {
                Log.d("ThreadReply", "Marked message as deleted: " + messageId);
            }
        }
    }

    /**
     * ENHANCED: Handle reaction updates from socket
     */
    private void handleReactionUpdated(String targetId, JSONObject reactionData) {
        try {
            String targetType = reactionData.getString("target_type");
            String reactionUserId = reactionData.optString("user_id", "");

            if ("comment".equals(targetType)) {
                if (String.valueOf(parentCommentId).equals(targetId)) {
                    // Check if this is from current user - if so, skip socket update for parent
                    // (their reaction was already handled optimistically)
                    if (!getCurrentUserId().equals(reactionUserId)) {
                        Log.d("ThreadReply", "Updating parent reactions from other user: " + reactionUserId);
                        JSONArray reactionsSummary = reactionData.getJSONArray("reactions_summary");
                        updateParentReactions(reactionsSummary);
                    } else {
                        Log.d("ThreadReply", "Skipping parent reaction update for current user");
                    }
                } else {
                    // Update reply reactions
                    if (repliesAdapter != null) {
                        repliesAdapter.updateReactionFromSocket(targetId, reactionData);
                    }
                }
            }
        } catch (JSONException e) {
            Log.e("ThreadReply", "Error handling reaction update", e);
        }
    }

    // Helper method to get current user ID
    private String getCurrentUserId() {
        SharedPreferences prefs = getSharedPreferences("login", MODE_PRIVATE);
        return prefs.getString("userid", "");
    }

    /**
     * NEW: Auto-scroll to new message if appropriate
     */
    private void autoScrollToNewMessage() {
        if (messagesRecyclerView == null) return;

        LinearLayoutManager layoutManager = (LinearLayoutManager) messagesRecyclerView.getLayoutManager();
        if (layoutManager == null) return;

        int lastVisiblePosition = layoutManager.findLastVisibleItemPosition();
        int totalItems = repliesAdapter.getItemCount();

        // Auto-scroll if user is near bottom (within 3 messages)
        if (lastVisiblePosition >= totalItems - 4) {
            messagesRecyclerView.post(() -> {
                messagesRecyclerView.smoothScrollToPosition(totalItems - 1);
            });
        }
    }

    /**
     * NEW: Show typing indicator
     */
    private void showTypingIndicator(String userName) {
        // Implement typing indicator UI
        // For example, show "userName is typing..." at bottom of chat
    }

    /**
     * NEW: Hide typing indicator
     */
    private void hideTypingIndicator(String userId) {
        // Hide typing indicator for specific user
    }

    /**
     * NEW: Update participant count
     */
    private void updateParticipantCount(int delta) {
        people += delta;
        TextView peopleCount = findViewById(R.id.onlineCount);
        if (peopleCount != null) {
            peopleCount.setText(people + " in this conversation");
        }
    }

    private void handleRoomUpdate(JSONObject roomData) {
        try {
            if (roomData.has("title")) {
                String newTitle = roomData.getString("title");
                // Update UI with new title
                if (drawerRoomName != null) {
                    drawerRoomName.setText(newTitle);
                }
            }

            if (roomData.has("participant_count")) {
                int newCount = roomData.getInt("participant_count");
                people = newCount;
                updateParticipantCount(0); // Just refresh display
            }
        } catch (JSONException e) {
            Log.e("ThreadReply", "Error handling room update", e);
        }
    }

    /**
     * NEW: Show new message notification
     */
    private void showNewMessageNotification(Opinion message) {
        // Create notification for background message
        // You can use NotificationManager here
        Log.d("ThreadReply", "📨 New message while in background from: " + message.getSenderName());
    }

    /**
     * ENHANCED: Message input with typing indicators
     */
    private void setupMessageInputWithTyping() {
        if (messageInput == null) return;

        messageInput.addTextChangedListener(new TextWatcher() {
            private boolean wasTyping = false;

            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                sendButton.setEnabled(s.length() > 0);

                // Handle typing indicators
                boolean isTyping = s.length() > 0;
                if (isTyping && !wasTyping) {
                    // Started typing
                    if (socketManager != null) {
                        socketManager.sendTypingStart();
                    }
                } else if (!isTyping && wasTyping) {
                    // Stopped typing
                    if (socketManager != null) {
                        socketManager.sendTypingStop();
                    }
                }
                wasTyping = isTyping;
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        // Stop typing indicator when focus is lost
        messageInput.setOnFocusChangeListener((v, hasFocus) -> {
            if (!hasFocus && socketManager != null) {
                socketManager.sendTypingStop();
            }
        });
    }




    private void fetchParticipants(int pageToLoad) {
        isLoading = true;
        loadMoreProgress.setVisibility(View.VISIBLE);

        OkHttpClient client = new OkHttpClient();
        MediaType mediaType = MediaType.parse("application/json");
        String json = String.format(Locale.US, "{\"articleId\":\"%s\", \"commentId\":\"%s\", \"page\":%d, \"limit\":25}",
                articleId, parentCommentId, pageToLoad);
        RequestBody body = RequestBody.create(mediaType, json);
        Request request = new Request.Builder()
                .url(API_URL)
                .post(body)
                .addHeader("Content-Type", "application/json")
                .addHeader("Authorization", "Bearer " + access)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override public void onFailure(@NonNull Call call, @NonNull IOException e) {
               runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                    isLoading = false;
                    loadMoreProgress.setVisibility(View.GONE);
                    Toast.makeText(ThreadReplyActivityOnline.this, "Failed to load", Toast.LENGTH_SHORT).show();
                });
            }

            @Override public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                String responseBody = response.body().string();
                ConversationResponse data = new Gson().fromJson(responseBody, ConversationResponse.class);

               runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                    // Check if activity is still alive
                    if (isFinishing() || isDestroyed()) {
                        return;
                    }

                    if (pageToLoad == 1) {
                        drawerRoomName.setText(title);
                        if (data != null && data.participants != null && !data.participants.isEmpty()) {
                            Participant starter = data.participants.get(0);
                            starterName.setText(starter.name);

                            // Only load image if activity is still alive
                            if (!isFinishing() && !isDestroyed()) {
                                Glide.with(ThreadReplyActivityOnline.this)
                                        .load(starter.display_pic)
                                        .placeholder(R.drawable.person)
                                        .circleCrop()
                                        .into(starterAvatar);
                            }

                            participantsList.addAll(data.participants);
                            adapter.notifyDataSetChanged();
                            memberCount.setText(String.valueOf(participantsList.size()));
                            hasNextPage = data.pagination.hasNextPage;
                        }
                    }

                    isLoading = false;
                    loadMoreProgress.setVisibility(View.GONE);
                });
            }
        });
    }
    private void initViews() {
        try {
            // Early return if activity is finishing
            if (isFinishing() || isDestroyed()) {
                Log.w("ThreadReply", "Activity finishing/destroyed, skipping initViews");
                return;
            }

            // Initialize invite button with null check
            initInviteButton();

            // Initialize core UI elements
            initCoreUIElements();

            // Initialize drawer and participants
            initDrawerAndParticipants();

            // Process message and quote content safely
            processMessageAndQuoteContent();

            // Setup reply preview and navigation
            setupReplyPreviewAndNavigation();

            // Setup text expansion if title exists
            setupTextExpansionSafely();

            // Update UI with intent data
            updateUIWithIntentData();

        } catch (Exception e) {
            Log.e("ThreadReply", "Error in initViews: " + e.getMessage(), e);
            // Show user-friendly error message
            safeUiUpdate(() -> {
                Toast.makeText(ThreadReplyActivityOnline.this,
                        "Error initializing interface", Toast.LENGTH_SHORT).show();
            });
            // Don't crash - continue with basic functionality
        }
    }

    private void initInviteButton() {
        try {
            inviteButton = findViewById(R.id.threadInviteButton);
            if (inviteButton != null) {
                inviteButton.setOnClickListener(view -> {
                    try {
                        UserSearchDialog searchDialog = new UserSearchDialog(
                                ThreadReplyActivityOnline.this,
                                access != null ? access : "",
                                isNightModeSwitchOn,
                                articleId,
                                parentCommentId
                        );
                        searchDialog.show();
                    } catch (Exception e) {
                        Log.e("ThreadReply", "Error showing user search dialog: " + e.getMessage(), e);
                        Toast.makeText(ThreadReplyActivityOnline.this,
                                "Error opening invite dialog", Toast.LENGTH_SHORT).show();
                    }
                });
            }
        } catch (Exception e) {
            Log.e("ThreadReply", "Error initializing invite button: " + e.getMessage(), e);
        }
    }

    private void initCoreUIElements() {
        try {
            // Initialize with null checks
            repliesCountText = findViewById(R.id.repliesCountText);
            emotionAccentLine = findViewById(R.id.emotionAccentLine);

            messagesRecyclerView = findViewById(R.id.threadRepliesRecyclerView);
            if (messagesRecyclerView != null) {
                messagesRecyclerView.setNestedScrollingEnabled(true);
            }

            shimmerFrameLayout = findViewById(R.id.shimmerFrameLayout);
            if (shimmerFrameLayout != null) {
                shimmerFrameLayout.startShimmer();
            }

        } catch (Exception e) {
            Log.e("ThreadReply", "Error initializing core UI elements: " + e.getMessage(), e);
        }
    }

    private void initDrawerAndParticipants() {
        try {
            drawerRoomName = findViewById(R.id.drawerRoomName);
            starterLabel = findViewById(R.id.starterLabel);
            starterName = findViewById(R.id.starterName);
            starterAvatar = findViewById(R.id.starterAvatar);
            memberCount = findViewById(R.id.memberCount);
            loadMoreProgress = findViewById(R.id.loadMoreProgress);
            membersRecyclerView = findViewById(R.id.membersRecyclerView);

            if (membersRecyclerView != null) {
                try {
                    adapter = new ParticipantAdapter(participantsList != null ? participantsList : new ArrayList<>());
                    membersRecyclerView.setLayoutManager(new LinearLayoutManager(this));
                    membersRecyclerView.setAdapter(adapter);

                    // Add scroll listener with error handling
                    membersRecyclerView.addOnScrollListener(new RecyclerView.OnScrollListener() {
                        @Override
                        public void onScrolled(@NonNull RecyclerView recyclerView, int dx, int dy) {
                            try {
                                if (!isLoading && hasNextPage) {
                                    LinearLayoutManager layoutManager = (LinearLayoutManager) recyclerView.getLayoutManager();
                                    if (layoutManager != null &&
                                            participantsList != null &&
                                            layoutManager.findLastCompletelyVisibleItemPosition() == participantsList.size() - 1) {
                                        fetchParticipants(++page);
                                    }
                                }
                            } catch (Exception e) {
                                Log.e("ThreadReply", "Error in members scroll listener: " + e.getMessage(), e);
                            }
                        }
                    });

                    // Fetch participants with error handling
                    fetchParticipants(page);

                } catch (Exception e) {
                    Log.e("ThreadReply", "Error setting up participants RecyclerView: " + e.getMessage(), e);
                }
            }

        } catch (Exception e) {
            Log.e("ThreadReply", "Error initializing drawer and participants: " + e.getMessage(), e);
        }
    }

    private void processMessageAndQuoteContent() {
        try {
            String extractedQuote = null;
            String remainingMessage = message;

            // Safely process message and quote extraction
            if (message != null && !message.trim().isEmpty() && message.trim().startsWith("\"")) {
                try {
                    extractedQuote = extractQuoteFromMessage(message);
                    if (extractedQuote != null) {
                        // Update remaining message
                        int quoteEndIndex = message.indexOf(extractedQuote) + extractedQuote.length() + 2; // +2 for quotes
                        if (quoteEndIndex < message.length()) {
                            String remaining = message.substring(quoteEndIndex);
                            // Skip newlines
                            remaining = remaining.replaceFirst("^[\r\n]+", "");
                            remainingMessage = remaining.trim();
                        } else {
                            remainingMessage = "";
                        }
                    }
                } catch (Exception e) {
                    Log.e("ThreadReply", "Error extracting quote from message: " + e.getMessage(), e);
                    // Keep original message if extraction fails
                    remainingMessage = message;
                }
            }

            // Handle quote content from intent
            if (quotecontent != null && quotecontent.length() > 1) {
                extractedQuote = quotecontent;
            }

            // Update message for further processing
            if (remainingMessage != null) {
                message = remainingMessage;
            }

            // Store extracted quote for later use
            this.quotecontent = extractedQuote;

        } catch (Exception e) {
            Log.e("ThreadReply", "Error processing message and quote content: " + e.getMessage(), e);
            // Keep original values if processing fails
        }
    }


    private void setupReplyPreviewAndNavigation() {
        try {
            // Initialize reply preview elements
            replyPreviewContainer = findViewById(R.id.replyPreviewContainer);
            replyPreviewText = findViewById(R.id.replyPreviewText);
            replyPreviewUsername = findViewById(R.id.replyPreviewUsername);
            replyingToLabel = findViewById(R.id.replyingToLabel);
            cancelReplyButton = findViewById(R.id.cancelReplyButton);

            if (replyPreviewContainer != null) {
                replyPreviewContainer.setVisibility(View.GONE);
            }

            // Set up cancel button with error handling
            if (cancelReplyButton != null) {
                cancelReplyButton.setOnClickListener(v -> {
                    try {
                        clearReplyingState();
                    } catch (Exception e) {
                        Log.e("ThreadReply", "Error clearing reply state: " + e.getMessage(), e);
                    }
                });
            }

            // Setup back button
            ImageButton backButton = findViewById(R.id.backButton);
            if (backButton != null) {
                backButton.setOnClickListener(v -> {
                    try {
                        onBackPressed();
                    } catch (Exception e) {
                        Log.e("ThreadReply", "Error handling back button: " + e.getMessage(), e);
                        // Fallback to finish activity
                        finish();
                    }
                });
            }

            // Setup drawer
            drawerLayout = findViewById(R.id.drawer_layout);
            ImageButton btnShowRoomPeople = findViewById(R.id.btnShowRoomPeople);
            if (btnShowRoomPeople != null && drawerLayout != null) {
                btnShowRoomPeople.setOnClickListener(v -> {
                    try {
                        if (!drawerLayout.isDrawerOpen(GravityCompat.END)) {
                            drawerLayout.openDrawer(GravityCompat.END);
                        }
                    } catch (Exception e) {
                        Log.e("ThreadReply", "Error opening drawer: " + e.getMessage(), e);
                    }
                });
            }

        } catch (Exception e) {
            Log.e("ThreadReply", "Error setting up reply preview and navigation: " + e.getMessage(), e);
        }
    }

    private void setupTextExpansionSafely() {
        try {
            if (title != null && title.length() > 1) {
                setupTextExpansion(message);
            }
        } catch (Exception e) {
            Log.e("ThreadReply", "Error setting up text expansion: " + e.getMessage(), e);
        }
    }

    private void updateUIWithIntentData() {
        try {
            // Set replies count safely
            if (repliesCountText != null) {
                try {
                    String repliesText = replies == 1 ? "1 message" : replies + " messages";
                    repliesCountText.setText(repliesText);
                } catch (Exception e) {
                    Log.e("ThreadReply", "Error setting replies count: " + e.getMessage(), e);
                    repliesCountText.setText("Messages");
                }
            }

            // Set people count safely
            TextView peopleCount = findViewById(R.id.onlineCount);
            if (peopleCount != null) {
                try {
                    peopleCount.setText(people + " in this conversation");
                } catch (Exception e) {
                    Log.e("ThreadReply", "Error setting people count: " + e.getMessage(), e);
                    peopleCount.setText("People in conversation");
                }
            }

        } catch (Exception e) {
            Log.e("ThreadReply", "Error updating UI with intent data: " + e.getMessage(), e);
        }
    }

    // Helper method to safely update UI



    private void hideInviteButton() {
        if (!isInviteButtonVisible) return;

        isInviteButtonVisible = false;

        // Calculate the distance to slide out (button width + margin)
        float slideDistance = -(inviteButton.getWidth() +
                ((LinearLayout.LayoutParams) inviteButton.getLayoutParams()).rightMargin +
                inviteButton.getPaddingStart());

        ObjectAnimator slideOut = ObjectAnimator.ofFloat(inviteButton, "translationX", 0f, slideDistance);
        ObjectAnimator fadeOut = ObjectAnimator.ofFloat(inviteButton, "alpha", 1f, 0f);

        AnimatorSet animatorSet = new AnimatorSet();
        animatorSet.playTogether(slideOut, fadeOut);
        animatorSet.setDuration(250);
        animatorSet.setInterpolator(new AccelerateDecelerateInterpolator());

        animatorSet.addListener(new AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(Animator animation) {
                inviteButton.setVisibility(View.GONE);
            }
        });

        animatorSet.start();
    }

    private void showInviteButton() {
        if (isInviteButtonVisible) return;

        isInviteButtonVisible = true;

        // Reset position and show the button
        inviteButton.setVisibility(View.VISIBLE);

        ObjectAnimator slideIn = ObjectAnimator.ofFloat(inviteButton, "translationX",
                inviteButton.getTranslationX(), 0f);
        ObjectAnimator fadeIn = ObjectAnimator.ofFloat(inviteButton, "alpha", 0f, 1f);

        AnimatorSet animatorSet = new AnimatorSet();
        animatorSet.playTogether(slideIn, fadeIn);
        animatorSet.setDuration(250);
        animatorSet.setInterpolator(new AccelerateDecelerateInterpolator());

        animatorSet.start();
    }

    private void setupSwipeToReply() {
        SwipeToReplyCallback swipeToReplyCallback = new SwipeToReplyCallback(
                this,
                replyPosition -> {
                    Log.d("SwipeToReply", "Swipe detected at reply position: " + replyPosition);

                    if (replyPosition >= 0 && replyPosition < repliesAdapter.getItemCount()) {
                        Opinion opinion = repliesAdapter.getCurrentList().get(replyPosition);
                        Log.d("SwipeToReply", "Replying to ID: " + opinion.getId() + ", sender: " + opinion.getSenderName());
                        setReplyingTo(opinion,true);
                    } else {
                        Log.w("SwipeToReply", "Reply position out of bounds");
                    }
                },
                isNightModeSwitchOn && isNightTime()
        );

        ItemTouchHelper itemTouchHelper = new ItemTouchHelper(swipeToReplyCallback);
        itemTouchHelper.attachToRecyclerView(messagesRecyclerView);
    }



    private void setupFocusListener() {
        messageInput.setOnFocusChangeListener(new View.OnFocusChangeListener() {
            @Override
            public void onFocusChange(View v, boolean hasFocus) {
                if (hasFocus) {
                    hideInviteButton();
                } else {
                    showInviteButton();
                }
            }
        });
    }
    private void setReplyingTo(Opinion opinion, boolean keyboardopen) {
      setReplyingToNew(opinion,null, keyboardopen);


    }

    public void setReplyingToNew(Opinion opinion, String emotion, boolean keyboardopen) {
        currentReplyingTo = opinion;
        currentEmotion = emotion; // Store current emotion for API calls

        // Set reply content
        replyPreviewUsername.setText(opinion.getSenderName());

        // Trim message if too long
        String message = opinion.getMessage();
        if (message.length() > 100) {
            message = message.substring(0, 97) + "...";
        }
        replyPreviewText.setText(message);

        // Set emotion-based background and accent
        setEmotionBasedStyling(emotion);

        // Set contextual label based on emotion
        setEmotionBasedLabel(emotion, opinion.getSenderName());

        // Show emotion indicator
        setEmotionIndicator(emotion);

        // Show the reply preview
        replyPreviewContainer.setVisibility(View.VISIBLE);

        // Change the hint text with emotion context
        messageInput.setHint(getEmotionBasedHint(emotion, opinion.getSenderName()));

        if (keyboardopen) {
            messageInput.requestFocus();
            InputMethodManager imm = (InputMethodManager)
                    messageInput.getContext().getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm != null) {
                imm.showSoftInput(messageInput, InputMethodManager.SHOW_IMPLICIT);
            }
        }
    }

    // Overloaded method for backward compatibility (no emotion)


    private void setEmotionBasedStyling(String emotion) {
        int backgroundDrawable;
        int accentDrawable;

        if (emotion == null) {
            backgroundDrawable = R.drawable.bg_emotion_default;
            accentDrawable = R.drawable.accent_emotion_default;
        } else {
            switch (emotion.toLowerCase()) {
                case "like":
                    backgroundDrawable = R.drawable.bg_emotion_like;
                    accentDrawable = R.drawable.accent_emotion_like;
                    break;
                case "love":
                    backgroundDrawable = R.drawable.bg_emotion_love;
                    accentDrawable = R.drawable.accent_emotion_love;
                    break;
                case "curious":
                    backgroundDrawable = R.drawable.bg_emotion_curious;
                    accentDrawable = R.drawable.accent_emotion_curious;
                    break;
                case "insightful":
                    backgroundDrawable = R.drawable.bg_emotion_insightful;
                    accentDrawable = R.drawable.accent_emotion_insightful;
                    break;
                case "celebrate":
                    backgroundDrawable = R.drawable.bg_emotion_celebrate;
                    accentDrawable = R.drawable.accent_emotion_celebrate;
                    break;
                case "support":
                    backgroundDrawable = R.drawable.bg_emotion_support;
                    accentDrawable = R.drawable.accent_emotion_support;
                    break;
                case "funny":
                    backgroundDrawable = R.drawable.bg_emotion_funny;
                    accentDrawable = R.drawable.accent_emotion_funny;
                    break;
                case "surprised":
                    backgroundDrawable = R.drawable.bg_emotion_surprised;
                    accentDrawable = R.drawable.accent_emotion_surprised;
                    break;
                case "sad":
                    backgroundDrawable = R.drawable.bg_emotion_sad;
                    accentDrawable = R.drawable.accent_emotion_sad;
                    break;
                case "angry":
                    backgroundDrawable = R.drawable.bg_emotion_angry;
                    accentDrawable = R.drawable.accent_emotion_angry;
                    break;
                default:
                    backgroundDrawable = R.drawable.bg_emotion_default;
                    accentDrawable = R.drawable.accent_emotion_default;
                     break;
            }
        }

        // Apply the backgrounds
        replyPreviewContainer.setBackground(ContextCompat.getDrawable(this, backgroundDrawable));
        emotionAccentLine.setBackground(ContextCompat.getDrawable(this, accentDrawable));
    }

    private void setEmotionBasedLabel(String emotion, String userName) {
        String label;

        if (emotion == null) {
            label = "Replying to";
        } else {
            switch (emotion.toLowerCase()) {
                case "like":
                    label = "Tell " + userName + " what you like";
                    break;
                case "love":
                    label = "Tell " + userName + " why you love this";
                    break;
                case "curious":
                    label = "Tell " + userName + " what you're curious about";
                    break;
                case "insightful":
                    label = "Tell " + userName + " what's insightful";
                    break;
                case "celebrate":
                    label = "Tell " + userName + " what you're celebrating";
                    break;
                case "support":
                    label = "Tell " + userName + " how you support this";
                    break;
                case "funny":
                    label = "Tell " + userName + " what's funny";
                    break;
                case "surprised":
                    label = "Tell " + userName + " what surprised you";
                    break;
                case "sad":
                    label = "Tell " + userName + " what makes you sad";
                    break;
                case "angry":
                    label = "Tell " + userName + " what bothers you";
                    break;
                default:
                    label = "Replying to";
                    break;
            }
        }

        replyingToLabel.setText(label);
    }

    private void setEmotionIndicator(String emotion) {
        if (emotion == null) {
            return;
        }

        String emoji;
        switch (emotion.toLowerCase()) {
            case "like":
                emoji = "👍";
                break;
            case "love":
                emoji = "❤️";
                break;
            case "curious":
                emoji = "🤔";
                break;
            case "insightful":
                emoji = "💡";
                break;
            case "celebrate":
                emoji = "🎉";
                break;
            case "support":
                emoji = "🤝";
                break;
            case "funny":
                emoji = "😂";
                break;
            case "surprised":
                emoji = "😮";
                break;
            case "sad":
                emoji = "😢";
                break;
            case "angry":
                emoji = "😠";
                break;
            default:
                return;
        }

    }

    private String getEmotionBasedHint(String emotion, String userName) {
        if (emotion == null) {
            return "Reply to " + userName + "...";
        }

        switch (emotion.toLowerCase()) {
            case "like":
                return "Share what you like about this...";
            case "love":
                return "Express why you love this...";
            case "curious":
                return "Ask what you're curious about...";
            case "insightful":
                return "Share your insights...";
            case "celebrate":
                return "Share what you're celebrating...";
            case "support":
                return "Show your support...";
            case "funny":
                return "Share what's funny...";
            case "surprised":
                return "Express your surprise...";
            case "sad":
                return "Share your thoughts...";
            case "angry":
                return "Express your concerns...";
            default:
                return "Reply to " + userName + "...";
        }
    }

// Updated reaction listener


    // Additional method to clear reply state
    private void clearReplyingTo() {
        currentReplyingTo = null;
        currentEmotion = null;
        replyPreviewContainer.setVisibility(View.GONE);
        messageInput.setHint("Share your thoughts...");

        // Reset to default styling
        setEmotionBasedStyling(null);
    }

    private void clearReplyingState() {
        currentEmotion=null;
        currentReplyingTo = null;
        replyPreviewContainer.setVisibility(View.GONE);
        messageInput.setHint("Reply in thread...");
    }

    private void setupStateViews() {
        emptyStateView = findViewById(R.id.threadEmptyStateLayout);
        loadingStateView = findViewById(R.id.threadLoadingStateLayout);
        errorStateView = findViewById(R.id.errorStateLayout);
        messagesRecyclerView = findViewById(R.id.threadRepliesRecyclerView);

        // Setup retry button if it exists
        Button retryButton = findViewById(R.id.retryButton);
        if (retryButton != null) {
            retryButton.setOnClickListener(v -> {
                loadReplies();
            });
        }
    }

    private void showLoadingState() {
      if(shimmerFrameLayout!=null){
          shimmerFrameLayout.setVisibility(View.VISIBLE);
          shimmerFrameLayout.startShimmer();
      }
        emptyStateView.setVisibility(View.GONE);
        if (errorStateView != null) errorStateView.setVisibility(View.GONE);
        messagesRecyclerView.setVisibility(View.GONE);
    }

    private void showEmptyState() {
        if (shimmerFrameLayout != null) {
            shimmerFrameLayout.setVisibility(View.GONE);
            shimmerFrameLayout.stopShimmer();
        }

        if (loadingStateView != null) {
            loadingStateView.setVisibility(View.GONE);
        }

        if (emptyStateView != null) {
            emptyStateView.setVisibility(View.VISIBLE);
        }

        if (errorStateView != null) {
            errorStateView.setVisibility(View.GONE);
        }

        if (messagesRecyclerView != null) {
            messagesRecyclerView.setVisibility(View.GONE);
        }
    }

    private void showErrorState() {
        if(shimmerFrameLayout!=null){
            shimmerFrameLayout.setVisibility(View.GONE);
            shimmerFrameLayout.stopShimmer();
        }
        loadingStateView.setVisibility(View.GONE);
        emptyStateView.setVisibility(View.GONE);
        if (errorStateView != null) errorStateView.setVisibility(View.VISIBLE);
        messagesRecyclerView.setVisibility(View.GONE);
    }

    private void showContent() {
        if (shimmerFrameLayout != null) {
            shimmerFrameLayout.setVisibility(View.GONE);
            shimmerFrameLayout.stopShimmer();
        }

        if (loadingStateView != null) {
            loadingStateView.setVisibility(View.GONE);
        }

        if (emptyStateView != null) {
            emptyStateView.setVisibility(View.GONE);
        }

        if (errorStateView != null) {
            errorStateView.setVisibility(View.GONE);
        }

        if (messagesRecyclerView != null) {
            messagesRecyclerView.setVisibility(View.VISIBLE);
        }
    }

    private void setupTextExpansion(String content) {
//        TextView summaryTextView = findViewById(R.id.summaryTextView);
//        TextView readMoreTextView = findViewById(R.id.readMoreTextView);
        aibutton = findViewById(R.id.aiask);
//        ScrollView scrollView = findViewById(R.id.contentScrollView);
//
        aibutton.setVisibility(View.GONE);
        aibutton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                showAiAssistant();
            }
        });
    }



    private void initializeModernAiAssistant() {
        // Find your root container (usually the main CoordinatorLayout)
        ViewGroup rootContainer = (ViewGroup) findViewById(android.R.id.content); //Replace with your actual root ID

        // Initialize the modern AI assistant
        aiAssistant = new ModernAiAssistant(this, rootContainer);
        aiAssistant.setDarkMode(isNightModeSwitchOn);

        // Set content data for the assistant
        aiAssistant.setContentData(description, currentLink);

        if (isNightModeSwitchOn) {
            aiAssistant.setDarkMode(true);
        }

        // Set up query listener with mode handling
        aiAssistant.setOnAiQueryListener(new ModernAiAssistant.OnAiQueryListener() {
            @Override
            public void onQuerySubmitted(String query, boolean isDeepSearch) {
                handleAiQuery(query, isDeepSearch);
            }
        });

        // Set up voice input listener (optional - uses default implementation if not set)
        aiAssistant.setOnVoiceInputListener(new ModernAiAssistant.OnVoiceInputListener() {
            @Override
            public void onVoiceInputRequested() {
                // Custom voice input handling if needed
                // The assistant will handle default voice recognition if this is not implemented
                Log.d("StudyActivity", "Voice input requested");
            }
        });

        aibutton = findViewById(R.id.aiask);
        // Set up AI button click listener
        if (aibutton != null) {
            aibutton.setVisibility(View.VISIBLE);
            aibutton.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    showAiAssistant();
                }
            });
        } else {
            Log.e("StudyActivity", "aibutton is null - check layout and findViewById call");
        }
    }

    private void showAiAssistant() {
        if (aiAssistant != null) {
            // Update content data before showing (in case it changed)
            aiAssistant.setContentData(description, currentLink);

            // Show the assistant
            aiAssistant.show();
        }
    }

    private String generateContentId() {
        if (currentLink != null) {
            return String.valueOf(currentLink.hashCode());
        }
        return UUID.randomUUID().toString();
    }

    private void handleAiQuery(String query, boolean isDeepSearch) {
        // This handles both Deep Search and Instant Answer modes
        long startTime = System.currentTimeMillis();


        try {

            AnalyticsManager.getInstance().trackAIQuery(
                    generateContentId(),
                    "assistant",
                    isDeepSearch ? "deep_search" : "instant_answer",
                    query.length(),
                    false, // voice input
                    description != null && !description.isEmpty(),
                    0, // will update with actual response time
                    true, // assume success initially
                    false,
                    "SocialMediaReadingActivity"
            );


            Intent mIntent = new Intent(ThreadReplyActivityOnline.this, SocialMediaReadingActivity.class);
            mIntent.putExtra("text", description != null ? description : "");
            mIntent.putExtra("listen", false);
            mIntent.putExtra("articleId", articleId);
            mIntent.putExtra("recognizedText", query);
            mIntent.putExtra("link", currentLink != null ? currentLink : "");
            mIntent.putExtra("convo", true);
            mIntent.putExtra("query", true);
            mIntent.putExtra("fast", !isDeepSearch);
            mIntent.putExtra("parentCommentId",parentCommentId);
            if(currentReplyingTo!=null) {
                mIntent.putExtra("replyMessageId",Integer.parseInt(currentReplyingTo.getId()));
            }

            long responseTime = System.currentTimeMillis() - startTime;
            AnalyticsManager.getInstance().trackAIQuery(
                    generateContentId(),
                    "assistant",
                    isDeepSearch ? "deep_search" : "instant_answer",
                    query.length(),
                    false,
                    description != null && !description.isEmpty(),
                    responseTime,
                    true,
                    false,
                    "SocialMediaReadingActivity"
            );
            // fast = true for instant answers, false for deep search
            clearReplyingState();
            startActivity(mIntent);


            // Simulate completion after starting activity
            new android.os.Handler().postDelayed(() -> {
                if (aiAssistant != null) {
                    aiAssistant.simulateQueryCompletion();
                }
            }, 1000);

        } catch (Exception e) {
            long responseTime = System.currentTimeMillis() - startTime;
            AnalyticsManager.getInstance().trackAIQuery(
                    generateContentId(),
                    "assistant",
                    isDeepSearch ? "deep_search" : "instant_answer",
                    query.length(),
                    false,
                    description != null && !description.isEmpty(),
                    responseTime,
                    false,
                    false,
                    "SocialMediaReadingActivity"
            );
            Log.e("StudyActivity", "Error handling AI query", e);
            Toast.makeText(this, "Error processing query", Toast.LENGTH_SHORT).show();

            if (aiAssistant != null) {
                aiAssistant.simulateQueryCompletion();
            }
        }
    }


    public Single<CommentsResponse> fetchComments(CommentsRequest request) {
        return Single.<CommentsResponse>create(emitter -> {
            OkHttpClient client = new OkHttpClient.Builder()
                    .connectTimeout(5, TimeUnit.SECONDS)
                    .readTimeout(5, TimeUnit.SECONDS)
                    .writeTimeout(5, TimeUnit.SECONDS)
                    .build();

            JSONObject jsonBody = new JSONObject();
            try {
                jsonBody.put("articleId", articleId);
                jsonBody.put("parentCommentId", parentCommentId);
                jsonBody.put("limit", request.limit);
                jsonBody.put("includeParentDetails", true);

                // Add enhanced API parameters
                if (request.cursor != null) {
                    jsonBody.put("cursor", request.cursor);
                }
                if (request.direction != null) {
                    jsonBody.put("direction", request.direction);
                }
                if (request.jumpToLatest) {
                    jsonBody.put("jump_to_latest", true);
                }
                if (request.focusCommentId != null) {
                    jsonBody.put("focusCommentId", request.focusCommentId);
                    jsonBody.put("contextSize", request.contextSize);
                }

                // Backward compatibility
                if (request.lastCommentId != null) {
                    jsonBody.put("lastCommentId", request.lastCommentId);
                }

            } catch (JSONException e) {
                if (!emitter.isDisposed()) emitter.onError(e);
                return;
            }

            RequestBody body = RequestBody.create(
                    MediaType.parse("application/json"),
                    jsonBody.toString()
            );

            Request httpRequest = new Request.Builder()
                    .url("https://api.typepilot.app/v1/room/subcommentsnew")
                    .post(body)
                    .addHeader("Content-Type", "application/json")
                    .addHeader("Authorization", "Bearer " + access)
                    .build();

            try {
                Call call = client.newCall(httpRequest);
                if (emitter.isDisposed()) return;

                Response response = call.execute();
                if (emitter.isDisposed()) {
                    response.close();
                    return;
                }

                if (!response.isSuccessful()) {
                    response.close();
                    throw new IOException("Unexpected code " + response);
                }

                String jsonData = response.body().string();
                response.close();

                if (emitter.isDisposed()) return;

                JSONObject jsonObject = new JSONObject(jsonData);
                JSONArray commentsArray = jsonObject.getJSONArray("comments");
                JSONObject pagination = jsonObject.getJSONObject("pagination");

                List<Opinion> opinions = new ArrayList<>();
                int focusIndex = -1;

                for (int i = 0; i < commentsArray.length(); i++) {
                    JSONObject comment = commentsArray.getJSONObject(i);
                    Opinion opinion = ThreadRepliesAdapter.fromApiComment(comment, currentUserId);
                    opinions.add(opinion);

                    // Check if this is the focus comment
                    if (request.focusCommentId != null &&
                            opinion.getId().equals(String.valueOf(request.focusCommentId))) {
                        focusIndex = i;
                    }
                }

                // DON'T sort - maintain server order (oldest first)

                CommentsResponse result = new CommentsResponse();
                result.comments = opinions;
                result.totalCount = jsonObject.optInt("total_comment_count", 0);
                result.focusCommentIndex = jsonObject.optInt("focus_comment_index", focusIndex);

                // Enhanced pagination info
                result.hasMoreBefore = pagination.optBoolean("has_more_before", false);
                result.hasMoreAfter = pagination.optBoolean("has_more_after", false);
                result.beforeCursor = pagination.optString("before_cursor", null);
                result.afterCursor = pagination.optString("after_cursor", null);
                result.isAtLatest = pagination.optBoolean("is_at_latest", true);
                result.isAtOldest = pagination.optBoolean("is_at_oldest", true);

                // Backward compatibility
                result.hasMore = pagination.optBoolean("has_more", false);
                result.nextCursor = pagination.optString("next_cursor", null);

                if (!emitter.isDisposed()) {
                    emitter.onSuccess(result);
                }

            } catch (InterruptedIOException e) {
                Log.d("ThreadReplies", "Request was interrupted", e);
            } catch (Exception e) {
                if (!emitter.isDisposed()) {
                    emitter.onError(e);
                }
            }
        });
    }

    @Override
    public void onDirectReaction(Opinion opinion, String emotion) {
        setReplyingToNew(opinion,emotion,false);
    }

    private enum LoadDirection {
        OLDER, NEWER
    }
    private void initializeViews() {
        messageSound = MediaPlayer.create(this, R.raw.sent);
        messageInput = findViewById(R.id.threadMessageInput);
        sendButton = findViewById(R.id.threadSendButton);

        jumpToRecentButton = findViewById(R.id.jumpToRecentButton);
        jumpToRecentButton.setOnClickListener(v -> jumpToRecentComments());
        jumpToRecentButton.setVisibility(View.GONE);

        // Setup message input
        messageInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                sendButton.setEnabled(s.length() > 0);
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        // Setup send button
        sendButton.setOnClickListener(v -> {
            String content = messageInput.getText().toString().trim();
            if (!content.isEmpty() && !isSending) {
                sendReply(content);
            }
        });

        // Setup RecyclerView for replies
        messagesRecyclerView = findViewById(R.id.threadRepliesRecyclerView);
        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        layoutManager.setItemPrefetchEnabled(true);
        messagesRecyclerView.setLayoutManager(layoutManager);

        // Create parent card adapter
        parentCardAdapter = new ParentCardAdapter(this, articleId, parentCommentId, currentUserId);
        Log.d("ParentCard", "Created ParentCardAdapter");

        // Create replies adapter (simplified - no parent card logic)
        repliesAdapter = new ThreadRepliesAdapter(
                categoryname,
                opinion -> handleReactionClick(opinion),
                opinion -> setReplyingTo(opinion,false),
                isNightModeSwitchOn && isNightTime(),
                this,
                messagesRecyclerView,
                articleId,
                description,
                imageUrl,
                currentLink,
                parentCommentId,
                this
        );
        Log.d("ParentCard", "Created ThreadRepliesAdapter");

        // Create concat adapter
        ConcatAdapter.Config config = new ConcatAdapter.Config.Builder()
                .setIsolateViewTypes(true)
                .build();

        ConcatAdapter concatAdapter = new ConcatAdapter(
                config,
                parentCardAdapter,
                repliesAdapter
        );
        Log.d("ParentCard", "Created ConcatAdapter with " + concatAdapter.getItemCount() + " total items");

        // Set parent card data
        ParentCardAdapter.ParentCardData parentData = createParentCardData();
        Log.d("ParentCard", "Created parent data: " + (parentData != null ? "SUCCESS" : "NULL"));
        if (parentData != null) {
            Log.d("ParentCard", "Parent data - Title: " + parentData.getTitle() +
                    ", Content: " + (parentData.getContent() != null ? parentData.getContent().substring(0, Math.min(50, parentData.getContent().length())) + "..." : "NULL") +
                    ", Author: " + parentData.getAuthorName());
        }

        parentCardAdapter.setParentCardData(parentData);
        Log.d("ParentCard", "Set parent data. Parent adapter item count: " + parentCardAdapter.getItemCount());
        Log.d("ParentCard", "Concat adapter total item count after setting data: " + concatAdapter.getItemCount());

        messagesRecyclerView.setClipToPadding(false);
        messagesRecyclerView.setClipChildren(false);
        messagesRecyclerView.setAdapter(concatAdapter);
        Log.d("ParentCard", "Set concat adapter on RecyclerView");

        setupSwipeToReply();

        // Add scroll listener to load more when reaching bottom
        messagesRecyclerView.addOnScrollListener(new RecyclerView.OnScrollListener() {
            @Override
            public void onScrolled(@NonNull RecyclerView recyclerView, int dx, int dy) {
                super.onScrolled(recyclerView, dx, dy);

                LinearLayoutManager layoutManager = (LinearLayoutManager) recyclerView.getLayoutManager();
                if (layoutManager == null) return;

                int firstVisibleItemPosition = layoutManager.findFirstVisibleItemPosition();
                int lastVisibleItemPosition = layoutManager.findLastVisibleItemPosition();
                int totalItemCount = layoutManager.getItemCount();

                if (!isLoading && !isLoadingMoreItems) {
                    // Adjust for parent card offset
                    int adjustedFirstVisible = Math.max(0, firstVisibleItemPosition - 1);
                    int adjustedLastVisible = lastVisibleItemPosition - 1;
                    int repliesCount = repliesAdapter.getItemCount();

                    // Load older comments when scrolling to top
                    if (adjustedFirstVisible <= 10 && currentPagination.hasMoreBefore && !currentPagination.isAtOldest) {
                        recyclerView.post(() -> {
                            isLoadingMoreItems = true;
                            loadMoreComments(LoadDirection.OLDER);
                        });
                    }
                    // Load newer comments when scrolling to bottom
                    else if (adjustedLastVisible >= repliesCount - 10 && currentPagination.hasMoreAfter && !currentPagination.isAtLatest) {
                        recyclerView.post(() -> {
                            isLoadingMoreItems = true;
                            loadMoreComments(LoadDirection.NEWER);
                        });
                    }
                }
                handleScrollDirectionFAB(dy, firstVisibleItemPosition, lastVisibleItemPosition, totalItemCount);
                // Show/hide jump to recent button
//                updateJumpToRecentButton(firstVisibleItemPosition, totalItemCount);
            }
        });
    }



    private void handleScrollDirectionFAB(int dy, int firstVisible, int lastVisible, int totalItems) {
        // Only show button if scrolling with sufficient velocity
        if (Math.abs(dy) < SCROLL_THRESHOLD) {
            return;
        }

        lastScrollTime = System.currentTimeMillis();

        // Check current position constraints
        boolean isAtTop = firstVisible <= 2; // Near top (accounting for parent card)
        boolean isAtBottom = lastVisible >= totalItems - 3; // Near bottom
        boolean hasScrolledSignificantly = firstVisible > 5; // Scrolled away from top

        if (dy > 0) {
            // Scrolling DOWN - show "jump to bottom" button to help continue downward
            if (hasScrolledSignificantly && !isAtBottom) {
                if (!currentPagination.isAtLatest) {
                    // There are newer messages - show "jump to recent"
                    showJumpToRecentButton();
                } else {
                    // At latest messages - show "jump to bottom"
                    showJumpToBottomButton();
                }
            }
        } else {
            // Scrolling UP - show "jump to top" button to help continue upward
            if (hasScrolledSignificantly && !isAtTop) {
                showJumpToTopButton();
            }
        }
    }


    private void updateJumpToRecentButton(int firstVisiblePosition, int totalItems) {
        LinearLayoutManager layoutManager = (LinearLayoutManager) messagesRecyclerView.getLayoutManager();
        if (layoutManager == null) return;

        int lastVisiblePosition = layoutManager.findLastVisibleItemPosition();
        boolean isAtBottom = lastVisiblePosition >= totalItems - 3; // Within 3 items of bottom
        boolean isScrolledUp = firstVisiblePosition > 5; // Scrolled up significantly

        // Determine button state
        if (currentPagination.isAtLatest && isAtBottom) {
            // At bottom and no more messages - show "jump to top"
            showJumpToTopButton();
        } else if (isScrolledUp && !currentPagination.isAtLatest) {
            // Scrolled up and there are newer messages - show "jump to recent"
            showJumpToRecentButton();
        } else if (isScrolledUp && currentPagination.isAtLatest) {
            // Scrolled up but at latest - show "jump to bottom"
            showJumpToBottomButton();
        } else {
            // Hide button
            jumpToRecentButton.setVisibility(View.GONE);
        }
    }

    private void showButtonWithFadeIn() {
        if (jumpToRecentButton.getVisibility() != View.VISIBLE) {
            jumpToRecentButton.setAlpha(0f);
            jumpToRecentButton.setVisibility(View.VISIBLE);
            jumpToRecentButton.animate()
                    .alpha(1f)
                    .setDuration(200)
                    .start();
        }
    }

    private void showJumpToTopButton() {
        showButtonWithFadeIn();
        jumpToRecentButton.setImageResource(R.drawable.baseline_keyboard_double_arrow_down_24);
        jumpToRecentButton.setContentDescription("Jump to top");

        // Rotate the button 180 degrees to point upward
        jumpToRecentButton.animate()
                .rotation(180f)
                .setDuration(300)
                .setInterpolator(new AccelerateDecelerateInterpolator())
                .start();

        // Update click listener
        jumpToRecentButton.setOnClickListener(v -> jumpToTop());
    }


    private void showJumpToRecentButton() {
        jumpToRecentButton.setVisibility(View.VISIBLE);
        jumpToRecentButton.setImageResource(R.drawable.baseline_keyboard_double_arrow_down_24); // You'll need this icon
        jumpToRecentButton.setContentDescription("Jump to recent messages");

        // Update click listener
        jumpToRecentButton.setOnClickListener(v -> jumpToRecentComments());
    }

    private void showJumpToBottomButton() {
        jumpToRecentButton.setVisibility(View.VISIBLE);
        jumpToRecentButton.setImageResource(R.drawable.baseline_keyboard_double_arrow_down_24);
        jumpToRecentButton.setContentDescription("Jump to bottom");

        // Update click listener
        jumpToRecentButton.setOnClickListener(v -> jumpToBottom());
    }

    // New method to jump to top
    private void jumpToTop() {
        LinearLayoutManager layoutManager = (LinearLayoutManager) messagesRecyclerView.getLayoutManager();
        if (layoutManager != null) {
            // Scroll to position 1 (after parent card)
            messagesRecyclerView.smoothScrollToPosition(1);

            // Hide button after scrolling
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                jumpToRecentButton.setVisibility(View.GONE);
            }, 1000);
        }
    }

    // New method to jump to bottom (current messages)
    private void jumpToBottom() {
        int totalItems = repliesAdapter.getItemCount();
        if (totalItems > 0) {
            // Scroll to last position
            messagesRecyclerView.smoothScrollToPosition(totalItems - 1);

            // Update button state after scrolling
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                updateJumpToRecentButton(totalItems - 1, totalItems);
            }, 1000);
        }
    }



    private void loadReplies() {
//        showLoadingState();
        isLoading = true;
        resetPaginationState();
        CommentsRequest request = CommentsRequest.initialLoad(PAGE_SIZE);

        fetchComments(request)
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .retry(2)
                .subscribe(new SingleObserver<CommentsResponse>() {
                    @Override
                    public void onSuccess(@NonNull CommentsResponse response) {
                        isLoading = false;
                        currentPagination = response;

                        updateRepliesCount(response.totalCount);

                        if (response.comments.isEmpty()) {
                           showContent();
                            return;
                        }

                        repliesAdapter.submitList(response.comments, () -> {
                            showContent();
                            updateJumpToRecentButton(0, response.comments.size());
                            if (!hasLoadedRecentMessages && !currentPagination.isAtLatest) {
                                silentlyLoadRecentMessages(false);
                            }
                        });
                    }

                    @Override
                    public void onError(@NonNull Throwable e) {
                        isLoading = false;
                        showErrorState();
                        Log.e("ThreadReplies", "Error loading replies", e);
                    }

                    @Override
                    public void onSubscribe(@NonNull Disposable d) {
                        disposables.add(d);
                    }
                });
    }

    private void updatePillandShow(boolean checking) {
        MaterialCardView newMessagesPill = findViewById(R.id.newMessagesPill);
        TextView pilltext = findViewById(R.id.pilltext);
        ImageView pillArrow = findViewById(R.id.pillArrow);

        if (newMessagesPill != null && pilltext != null) {
            // Cancel any existing hide timer
            if (pillHideRunnable != null) {
                pillHandler.removeCallbacks(pillHideRunnable);
            }

            // Update text and colors based on checking state
            if (checking) {
                pilltext.setText("checking new messages");
                newMessagesPill.setCardBackgroundColor(ContextCompat.getColor(this, android.R.color.darker_gray));
                pilltext.setTextColor(ContextCompat.getColor(this, android.R.color.white));
                if (pillArrow != null) {
                    pillArrow.setColorFilter(ContextCompat.getColor(this, android.R.color.white));
                }
            } else {
                pilltext.setText("New messages available");
                newMessagesPill.setCardBackgroundColor(ContextCompat.getColor(this, R.color.primary_color)); // Your blue color
                pilltext.setTextColor(ContextCompat.getColor(this, android.R.color.white));
                if (pillArrow != null) {
                    pillArrow.setColorFilter(ContextCompat.getColor(this, android.R.color.white));
                }
            }

            // Show the pill
            newMessagesPill.setVisibility(View.VISIBLE);

            // Set click listener to hide immediately
            newMessagesPill.setOnClickListener(v -> {
                newMessagesPill.setVisibility(View.GONE);
                if (pillHideRunnable != null) {
                    pillHandler.removeCallbacks(pillHideRunnable);
                }
                int totalItems = repliesAdapter.getItemCount();
                if (totalItems > 0) {
                    int lastPosition = totalItems;
                    // Scroll to last position (totalItems - 1, since positions are 0-indexed)
                    smoothScrollToPositionNew(lastPosition);
                }
                // Add your scroll to new messages logic here if needed
            });

            // Set up 5-second auto-hide timer
            pillHideRunnable = () -> {
                if (newMessagesPill.getVisibility() == View.VISIBLE) {
                    newMessagesPill.setVisibility(View.GONE);
                }
            };
            pillHandler.postDelayed(pillHideRunnable, 5000); // 5 seconds
        }
    }

    private void hidePill() {
        MaterialCardView newMessagesPill = findViewById(R.id.newMessagesPill);

        if (newMessagesPill != null) {
            newMessagesPill.setVisibility(View.GONE);

            // Cancel any existing hide timer
            if (pillHideRunnable != null) {
                pillHandler.removeCallbacks(pillHideRunnable);
            }
        }
    }
    private void silentlyLoadRecentMessages(boolean resumed) {
        if (hasLoadedRecentMessages || isLoading) {
            return;
        }

        Log.d("ThreadReplies", "Silently loading recent messages...");

        // Use jump to latest request but don't show loading state
        CommentsRequest request = CommentsRequest.jumpToLatest(PAGE_SIZE);

        fetchComments(request)
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(new SingleObserver<CommentsResponse>() {
                    @Override
                    public void onSuccess(@NonNull CommentsResponse recentResponse) {
                        hasLoadedRecentMessages = true;

                        if (recentResponse.comments.isEmpty()) {
                            Log.d("ThreadReplies", "No recent messages to add");
                            return;
                        }

                        // Get current list
                        List<Opinion> currentList = new ArrayList<>(repliesAdapter.getCurrentList());
                        Set<String> existingIds = new HashSet<>();
                           for (Opinion opinion : currentList) {

                            existingIds.add(opinion.getId());
                        }

                        // Find truly new messages
                        List<Opinion> newMessages = new ArrayList<>();
                        for (Opinion opinion : recentResponse.comments) {
                            if (!existingIds.contains(opinion.getId())) {

                                newMessages.add(opinion);
                            }
                        }
                        if(foreground) {
                            updatePillandShow(false);
                        }
                        else{
                            hidePill();
                        }

                        if (!newMessages.isEmpty()) {
                            Log.d("ThreadReplies", "Adding " + newMessages.size() + " recent messages silently");

                            // Add new messages to the end
                            currentList.addAll(newMessages);

                            // Update pagination with recent response data
                            currentPagination.hasMoreAfter = recentResponse.hasMoreAfter;
                            currentPagination.isAtLatest = recentResponse.isAtLatest;
                            currentPagination.afterCursor = recentResponse.afterCursor;

                            // Submit updated list
                            repliesAdapter.submitList(currentList, () -> {
                                // Update jump button state based on new pagination
                                LinearLayoutManager layoutManager = (LinearLayoutManager) messagesRecyclerView.getLayoutManager();
                                if (layoutManager != null) {
                                    showJumpToRecentButton();

                                }
                            });
                        }
                        if(resumed) {

                        }
                    }

                    @Override
                    public void onError(@NonNull Throwable e) {
                        Log.e("ThreadReplies", "Error silently loading recent messages", e);
                        // Fail silently - don't show error to user
                    }

                    @Override
                    public void onSubscribe(@NonNull Disposable d) {
                        disposables.add(d);
                    }
                });
    }


    private void loadMoreComments(LoadDirection direction) {
        // Double-check we should load more
        if (direction == LoadDirection.OLDER && (!currentPagination.hasMoreBefore || currentPagination.isAtOldest)) {
            Log.d("LoadMore", "Skipping older load - no more data");
            isLoadingMoreItems = false;
            return;
        }

        if (direction == LoadDirection.NEWER && (!currentPagination.hasMoreAfter || currentPagination.isAtLatest)) {
            Log.d("LoadMore", "Skipping newer load - already at latest");
            isLoadingMoreItems = false;
            return;
        }

        CommentsRequest request;
        String cursor;

        if (direction == LoadDirection.OLDER) {
            cursor = currentPagination.beforeCursor;
            if (cursor == null || cursor.isEmpty() || cursor.equals(lastBeforeCursor)) {
                Log.d("LoadMore", "No valid before cursor available or cursor unchanged");
                isLoadingMoreItems = false;
                // Force stop loading in this direction
                currentPagination.hasMoreBefore = false;
                currentPagination.isAtOldest = true;
                return;
            }
            lastBeforeCursor = cursor;
            request = CommentsRequest.loadOlder(cursor, PAGE_SIZE);
        } else {
            cursor = currentPagination.afterCursor;
            if (cursor == null || cursor.isEmpty() || cursor.equals(lastAfterCursor)) {
                Log.d("LoadMore", "No valid after cursor available or cursor unchanged");
                isLoadingMoreItems = false;
                // Force stop loading in this direction
                currentPagination.hasMoreAfter = false;
                currentPagination.isAtLatest = true;
                return;
            }
            lastAfterCursor = cursor;
            request = CommentsRequest.loadNewer(cursor, PAGE_SIZE);
        }

        Log.d("LoadMore", "Loading " + direction + " with cursor: " + cursor);

        fetchComments(request)
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(new SingleObserver<CommentsResponse>() {
                    @Override
                    public void onSuccess(@NonNull CommentsResponse response) {
                        isLoadingMoreItems = false;

                        Log.d("LoadMore", "Loaded " + response.comments.size() + " comments");
                        Log.d("LoadMore", "hasMoreBefore: " + response.hasMoreBefore + ", hasMoreAfter: " + response.hasMoreAfter);
                        Log.d("LoadMore", "isAtLatest: " + response.isAtLatest + ", isAtOldest: " + response.isAtOldest);

                        // Skip if no new comments
                        if (response.comments.isEmpty()) {
                            Log.d("LoadMore", "No new comments received - updating pagination state");
                            // Update pagination state even if no comments received
                            if (direction == LoadDirection.OLDER) {
                                currentPagination.hasMoreBefore = false;
                                currentPagination.isAtOldest = true;
                            } else {
                                currentPagination.hasMoreAfter = false;
                                currentPagination.isAtLatest = true;
                            }
                            return;
                        }

                        List<Opinion> currentList = new ArrayList<>(repliesAdapter.getCurrentList());
                        Set<String> currentIds = new HashSet<>();

                        // Create set of current comment IDs for duplicate detection
                        for (Opinion opinion : currentList) {
                            currentIds.add(opinion.getId());
                        }

                        // Filter out duplicates from response
                        List<Opinion> newComments = new ArrayList<>();
                        for (Opinion comment : response.comments) {
                            if (!currentIds.contains(comment.getId())) {
                                newComments.add(comment);
                            }
                        }

                        Log.d("LoadMore", "Filtered duplicates: " + response.comments.size() + " -> " + newComments.size());

                        // CLIENT-SIDE BOUNDARY DETECTION: If all comments were duplicates, we've hit the boundary
                        if (newComments.isEmpty()) {
                            Log.d("LoadMore", "All comments were duplicates - we've reached the boundary!");
                            if (direction == LoadDirection.OLDER) {
                                currentPagination.hasMoreBefore = false;
                                currentPagination.isAtOldest = true;
                                lastBeforeCursor = null;
                                Log.d("LoadMore", "BOUNDARY DETECTED: No more older comments");
                            } else {
                                currentPagination.hasMoreAfter = false;
                                currentPagination.isAtLatest = true;
                                lastAfterCursor = null;
                                Log.d("LoadMore", "BOUNDARY DETECTED: No more newer comments - forcing isAtLatest=true");
                            }
                            return;
                        }

                        // ADDITIONAL BOUNDARY CHECK: If we have all comments from totalCount
                        int currentTotalInList = currentList.size();
                        int totalCommentsInRoom = currentPagination.totalCount;

                        if (direction == LoadDirection.NEWER && totalCommentsInRoom > 0) {
                            int afterAddingNew = currentTotalInList + newComments.size();
                            if (afterAddingNew >= totalCommentsInRoom) {
                                Log.d("LoadMore", "BOUNDARY DETECTED: Will have all comments (" + afterAddingNew + "/" + totalCommentsInRoom + ") - forcing stop");
                                // Only add comments up to the total count
                                int commentsToAdd = Math.max(0, totalCommentsInRoom - currentTotalInList);
                                if (commentsToAdd < newComments.size()) {
                                    newComments = newComments.subList(0, commentsToAdd);
                                }
                                // Force boundary state
                                currentPagination.hasMoreAfter = false;
                                currentPagination.isAtLatest = true;
                                lastAfterCursor = null;
                            }
                        }

                        int originalSize = currentList.size();

                        if (direction == LoadDirection.OLDER) {
                            // Add older comments at the beginning
                            currentList.addAll(0, newComments);
                            currentPagination.hasMoreBefore = response.hasMoreBefore;
                            currentPagination.beforeCursor = response.beforeCursor;
                            currentPagination.isAtOldest = response.isAtOldest;

                            // If we got fewer comments than requested, we might be at the end
                            if (newComments.size() < PAGE_SIZE) {
                                currentPagination.hasMoreBefore = false;
                                currentPagination.isAtOldest = true;
                            }
                        } else {
                            // Add newer comments at the end
                            currentList.addAll(newComments);

                            // Trust server response for pagination state
                            currentPagination.hasMoreAfter = response.hasMoreAfter && response.comments.size() >= PAGE_SIZE;
                            currentPagination.afterCursor = response.afterCursor;
                            currentPagination.isAtLatest = response.isAtLatest || response.comments.size() < PAGE_SIZE;

                            // Additional safety: if server says we're at latest, enforce it
                            if (response.isAtLatest) {
                                currentPagination.hasMoreAfter = false;
                                currentPagination.isAtLatest = true;
                                lastAfterCursor = null;
                                Log.d("LoadMore", "Server confirms we are at latest - stopping future loads");
                            }


                        }

                        Log.d("LoadMore", "List size: " + originalSize + " -> " + currentList.size());
                        Log.d("LoadMore", "Updated pagination - hasMoreBefore: " + currentPagination.hasMoreBefore +
                                ", hasMoreAfter: " + currentPagination.hasMoreAfter +
                                ", isAtLatest: " + currentPagination.isAtLatest);

                        // Debug current state


                        repliesAdapter.submitList(currentList);

                        // Auto-correct any remaining server bugs
                    }

                    @Override
                    public void onError(@NonNull Throwable e) {
                        isLoadingMoreItems = false;
                        Toast.makeText(ThreadReplyActivityOnline.this,
                                "Failed to load more comments", Toast.LENGTH_SHORT).show();
                        Log.e("ThreadReplies", "Error loading more comments", e);
                    }

                    @Override
                    public void onSubscribe(@NonNull Disposable d) {
                        disposables.add(d);
                    }
                });
    }


    private void jumpToRecentComments() {
        if (hasLoadedRecentMessages && currentPagination.isAtLatest) {
            jumpToBottom();
            return;
        }
        showLoadingState();
        isLoading = true;
        isLoadingMoreItems = false;
        // Reset cursor tracking
        lastAfterCursor = null;
        lastBeforeCursor = null;// Reset this state

        CommentsRequest request = CommentsRequest.jumpToLatest(PAGE_SIZE);

        fetchComments(request)
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(new SingleObserver<CommentsResponse>() {
                    @Override
                    public void onSuccess(@NonNull CommentsResponse response) {
                        isLoading = false;
                        isLoadingMoreItems = false;

                        // Ensure we're marked as at latest
                        currentPagination = response;
                        currentPagination.isAtLatest = true;
                        currentPagination.hasMoreAfter = false;

                        Log.d("JumpToRecent", "Jumped to recent. isAtLatest: " + currentPagination.isAtLatest +
                                ", hasMoreAfter: " + currentPagination.hasMoreAfter);

                        repliesAdapter.submitList(response.comments, () -> {
                            showContent();
                            // Scroll to bottom to show latest comments
                            if (response.comments.size() > 0) {
                                messagesRecyclerView.scrollToPosition(response.comments.size());
                            }
                            jumpToRecentButton.setVisibility(View.GONE);
                        });
                    }

                    @Override
                    public void onError(@NonNull Throwable e) {
                        isLoading = false;
                        isLoadingMoreItems = false;
                        Toast.makeText(ThreadReplyActivityOnline.this,
                                "Failed to jump to recent comments", Toast.LENGTH_SHORT).show();
                    }

                    @Override
                    public void onSubscribe(@NonNull Disposable d) {
                        disposables.add(d);
                    }
                });
    }

    private void resetPaginationState() {
        currentPagination = new CommentsResponse();
        currentPagination.hasMoreBefore = false;
        currentPagination.hasMoreAfter = false;
        currentPagination.isAtLatest = true;
        currentPagination.isAtOldest = true;
        isLoadingMoreItems = false;
        lastAfterCursor = null; // Reset cursor tracking
        lastBeforeCursor = null;
    }

    private void stopAllLoading() {
        isLoading = false;
        isLoadingMoreItems = false;
        currentPagination.hasMoreBefore = false;
        currentPagination.hasMoreAfter = false;
        currentPagination.isAtLatest = true;
        currentPagination.isAtOldest = true;
        lastAfterCursor = null; // Reset cursor tracking
        lastBeforeCursor = null;
        Log.d("StopLoading", "All loading stopped and pagination disabled");
    }

    void scrollToOriginalMessage(int messageId) {
        // Check if the message is already in the current list
        int position = findCommentPositionById(String.valueOf(messageId));

        if (position != -1) {
            // Message exists in the current list, scroll to it
            smoothScrollToPosition(position+1);
            highlightComment(position+1);
        } else {
            // Message is not in the current list, need to fetch it
            fetchAndScrollToComment(messageId);
        }
    }

    /**
     * Finds the position of a comment in the current list by its ID
     *
     * @param commentId the ID of the comment to find
     * @return the position of the comment in the list, or -1 if not found
     */
    private int findCommentPositionById(String commentId) {
        List<Opinion> currentList = repliesAdapter.getCurrentList();
        for (int i = 0; i < currentList.size(); i++) {
            if (currentList.get(i).getId().equals(commentId)) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Smoothly scrolls to a position in the RecyclerView
     *
     * @param position the position to scroll to
     */
    private void smoothScrollToPosition(int position) {
        LinearLayoutManager layoutManager = (LinearLayoutManager) messagesRecyclerView.getLayoutManager();
        if (layoutManager == null) return;

        // Calculate the optimal scroll position to make the target item visible in a good position
        // (not too close to the top or bottom)

        // Get first visible position
        int firstVisible = layoutManager.findFirstVisibleItemPosition();
        int lastVisible = layoutManager.findLastVisibleItemPosition();
        int visibleCount = lastVisible - firstVisible + 1;

        // Determine the target position that puts our item in the middle
        int targetScrollPosition;

        if (position < firstVisible) {
            // Target is above visible area
            targetScrollPosition = Math.max(0, position - (visibleCount / 4));
        } else if (position > lastVisible) {
            // Target is below visible area
            targetScrollPosition = position;
        } else {
            // Target is already visible, no need to scroll
            highlightComment(position);
            return;
        }

        // Perform a smooth scroll
        messagesRecyclerView.smoothScrollToPosition(targetScrollPosition);

        // Schedule highlighting after scroll completes
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            highlightComment(position);
        }, 800); // Small delay to ensure scroll is complete
    }


    private void smoothScrollToPositionNew(int position) {
        LinearLayoutManager layoutManager = (LinearLayoutManager) messagesRecyclerView.getLayoutManager();
        if (layoutManager == null) return;

        // Calculate the optimal scroll position to make the target item visible in a good position
        // (not too close to the top or bottom)

        // Get first visible position
        int firstVisible = layoutManager.findFirstVisibleItemPosition();
        int lastVisible = layoutManager.findLastVisibleItemPosition();
        int visibleCount = lastVisible - firstVisible + 1;

        // Determine the target position that puts our item in the middle
        int targetScrollPosition;

        if (position < firstVisible) {
            // Target is above visible area
            targetScrollPosition = Math.max(0, position - (visibleCount / 4));
        } else if (position > lastVisible) {
            // Target is below visible area
            targetScrollPosition = position;
        }
        else{
            targetScrollPosition = 0;
        }

        // Perform a smooth scroll
        messagesRecyclerView.smoothScrollToPosition(targetScrollPosition);

        // Schedule highlighting after scroll completes
    }

    private void showCustomAiDialog() {
        // Method 2: Using Builder pattern for customization
        AiInputDialog dialog = new AiInputDialog.Builder(this)
                .setTitle("Ask AI with search")
                .setSubtitle("Powered by Philonet.ai")
                .setContextMessage(description.length()>200 ? description.substring(0,200)+"...":description)
                .setOnAiRequestListener(new AiInputDialog.OnAiRequestListener() {
                    @Override
                    public void onAiRequest(String userInput) {
//                        handleAiRequest(userInput);

                        Intent mIntent = new Intent(ThreadReplyActivityOnline.this, SocialMediaReadingActivity.class);
                        mIntent.putExtra("text", summarynew);
                        mIntent.putExtra("listen", false);
                        mIntent.putExtra("recognizedText", userInput);
                        mIntent.putExtra("link", "");
                        mIntent.putExtra("convo", true);
                        mIntent.putExtra("articleId", articleId);
                        mIntent.putExtra("fast", true);
                        mIntent.putExtra("query", true);
                        mIntent.putExtra("parentCommentId",parentCommentId);
                        if(currentReplyingTo!=null) {
                            mIntent.putExtra("replyMessageId",Integer.parseInt(currentReplyingTo.getId()));
                        }
                        clearReplyingState();
                        startActivity(mIntent);
                    }

                    @Override
                    public void onCancel() {
//                        Log.d(TAG, "AI dialog cancelled");
                    }
                })
                .build();

        dialog.show();
    }

    /**
     * Highlights a comment to draw user attention
     *
     * @param position the position of the comment in the list
     */
    private void highlightComment(int position) {
        View view = messagesRecyclerView.getLayoutManager().findViewByPosition(position);
        if (view != null) {
            CardView messageCard = view.findViewById(R.id.messageCard);
            if (messageCard != null) {
                // Create bounce animation
                AnimatorSet bounceAnimation = new AnimatorSet();

                // Scale up animation
                ObjectAnimator scaleUpX = ObjectAnimator.ofFloat(messageCard, "scaleX", 1.0f, 1.1f);
                ObjectAnimator scaleUpY = ObjectAnimator.ofFloat(messageCard, "scaleY", 1.0f, 1.1f);

                // Scale down animation
                ObjectAnimator scaleDownX = ObjectAnimator.ofFloat(messageCard, "scaleX", 1.1f, 1.0f);
                ObjectAnimator scaleDownY = ObjectAnimator.ofFloat(messageCard, "scaleY", 1.1f, 1.0f);

                // Configure animations
                scaleUpX.setDuration(500);
                scaleUpY.setDuration(500);
                scaleDownX.setDuration(1000);
                scaleDownY.setDuration(1000);

                // Use bounce interpolator for the scale down
                BounceInterpolator bounceInterpolator = new BounceInterpolator();
                scaleDownX.setInterpolator(bounceInterpolator);
                scaleDownY.setInterpolator(bounceInterpolator);

                // Play scale up first, then scale down
                bounceAnimation.play(scaleUpX).with(scaleUpY);
                bounceAnimation.play(scaleDownX).with(scaleDownY).after(scaleUpX);

                // Ensure we reset to original scale
                bounceAnimation.addListener(new AnimatorListenerAdapter() {
                    @Override
                    public void onAnimationEnd(Animator animation) {
                        messageCard.setScaleX(1.0f);
                        messageCard.setScaleY(1.0f);
                    }
                });

                bounceAnimation.start();
            }
        }
    }

    /**
     * Fetches a specific comment and its context, then scrolls to it.
     * Uses the focus_comment_id parameter in the API.
     *
     * @param commentId the ID of the comment to fetch and scroll to
     */
    private void fetchAndScrollToComment(int commentId) {
        showLoadingState();
        isLoading = true;
        isLoadingMoreItems = true;

        CommentsRequest request = CommentsRequest.focusComment(commentId, 25);

        fetchComments(request)
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(new SingleObserver<CommentsResponse>() {
                    @Override
                    public void onSuccess(@NonNull CommentsResponse response) {
                        isLoading = false;
                        isLoadingMoreItems = false;
                        currentPagination = response;

                        if (response.comments.isEmpty()) {
                            Toast.makeText(ThreadReplyActivityOnline.this,
                                    "Comment not found or was deleted", Toast.LENGTH_SHORT).show();
                            showContent();
                            return;
                        }

                        updateRepliesCount(response.totalCount);

                        repliesAdapter.submitList(response.comments, () -> {
                            showContent();

                            if (response.focusCommentIndex >= 0) {
                                new Handler(Looper.getMainLooper()).post(() -> {
                                    smoothScrollToPosition(response.focusCommentIndex+1);

                                    new Handler(Looper.getMainLooper()).postDelayed(() -> {
                                        highlightComment(response.focusCommentIndex+1);
                                    }, 500);
                                });
                            }
                        });
                    }

                    @Override
                    public void onError(@NonNull Throwable e) {
                        isLoading = false;
                        isLoadingMoreItems = false;
                        showContent();
                        Toast.makeText(ThreadReplyActivityOnline.this,
                                "Error loading comment: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    }

                    @Override
                    public void onSubscribe(@NonNull Disposable d) {
                        disposables.add(d);
                    }
                });
    }


    // More aggressive method to force scroll to bottom
    private void forceScrollToBottom() {
        if (repliesAdapter.getItemCount() == 0) {
            return;
        }

        final int lastPosition = repliesAdapter.getItemCount() - 1;
        Log.d("ThreadReplies", "Forcing scroll to bottom, item count: " + repliesAdapter.getItemCount());

        // Method 1: Immediate scroll
        LinearLayoutManager layoutManager = (LinearLayoutManager) messagesRecyclerView.getLayoutManager();
        if (layoutManager != null) {
            layoutManager.scrollToPositionWithOffset(lastPosition, 0);
        }

        // Method 2: Post to message queue
        messagesRecyclerView.post(() -> {
            messagesRecyclerView.scrollToPosition(lastPosition);

            // Method 3: Another post with delay to ensure it happens
            messagesRecyclerView.postDelayed(() -> {
                if (layoutManager != null) {
                    layoutManager.scrollToPosition(lastPosition);

                    // Verify the scroll worked
                    messagesRecyclerView.post(() -> {
                        int currentFirst = layoutManager.findFirstVisibleItemPosition();
                        int currentLast = layoutManager.findLastVisibleItemPosition();
                        Log.d("ThreadReplies", "After scroll - First visible: " + currentFirst +
                                ", Last visible: " + currentLast + ", Total items: " + repliesAdapter.getItemCount());

                        // If we're still at the top, try one more time with smooth scroll
                        if (currentFirst <= 2 && repliesAdapter.getItemCount() > 5) {
                            Log.w("ThreadReplies", "Still at top, trying smooth scroll");
                            messagesRecyclerView.smoothScrollToPosition(lastPosition);
                        }
                    });
                }
            }, 100); // Small delay to ensure layout is complete
        });
    }



    private void cleanupLoading() {
        isLoading = false;
        isLoadingMoreItems = false;
        repliesAdapter.setLoadingMore(false);
    }

    private void autoJoinAndSendReply(String content) {
        if (isSending) return;

        isSending = true;
        sendButton.setEnabled(false);
        messageInput.setEnabled(false);

        // Show a subtle loading indicator
        showInlineLoadingForJoin();

        OkHttpClient client = new OkHttpClient();
        JSONObject jsonBody = new JSONObject();

        try {
            jsonBody.put("articleId", articleId);
        } catch (JSONException e) {
            e.printStackTrace();
            handleJoinError("Error preparing join request", content);
            return;
        }

        RequestBody body = RequestBody.create(
                MediaType.parse("application/json"),
                jsonBody.toString()
        );

        Request request = new Request.Builder()
                .url("https://api.typepilot.app/v1/room/article/join-as-guest")
                .post(body)
                .addHeader("Content-Type", "application/json")
                .addHeader("Authorization", "Bearer " + access)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
               runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                    handleJoinError("Failed to join room. Please try again.", content);
                });
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                if (response.isSuccessful()) {
                    try {
                        String responseData = response.body().string();
                        JSONObject jsonResponse = new JSONObject(responseData);
                        boolean success = jsonResponse.optBoolean("success", false);

                        if (success) {
                           runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                                // Successfully joined - update state and send reply
                                needsToJoin = false;
                                hideInlineLoadingForJoin();

                                // Show brief success message
                                showJoinSuccessMessage();

                                // Now send the original reply
                                sendReplyAfterJoinCheck(content);
                            });
                        } else {
                            String errorMessage = jsonResponse.optString("error", "Failed to join room");
                            runOnUiThread(() -> {
                                if (!isUiSafe()) return;
                                handleJoinError(errorMessage, content);
                            });
                        }
                    } catch (Exception e) {
                        runOnUiThread(() -> {
                            if (!isUiSafe()) return;
                            handleJoinError("Error processing join response", content);
                        });
                    }
                } else {
                    runOnUiThread(() -> {
                        if (!isUiSafe()) return;
                        handleJoinError("Failed to join room (Error " + response.code() + ")", content);
                    });
                }
            }
        });
    }

    private void sendReplyAfterJoinCheck(String content) {
        // Get API content before disabling the input
        String apiContent = messageInput.getTextForSubmission();

        // Create and display optimistic message immediately
        String tempId = "temp_" + System.currentTimeMillis();
        Opinion optimisticMessage = new Opinion.Builder()
                .setId(tempId)
                .setSenderId(currentUserId)
                .setSenderName("You")
                .setMiniMessage("")
                .setMessage(content)
                .setTimestamp(System.currentTimeMillis())
                .setStatus(MessageStatus.SENT)
                .setParentCommentId(parentCommentId)
                .build();

        if (currentReplyingTo != null) {
            optimisticMessage.setReplyid(Integer.parseInt(currentReplyingTo.getId()));
            optimisticMessage.setReplyusername(currentReplyingTo.getSenderName());
            optimisticMessage.setReplycontent(currentReplyingTo.getMessage());
        }

        // Clear input immediately for instant user feedback
        messageInput.setText("");

        // Add to UI immediately and force refresh
        List<Opinion> currentList = new ArrayList<>(repliesAdapter.getCurrentList());
        currentList.add(optimisticMessage);

        repliesAdapter.submitList(currentList, () -> {
            // Scroll to the newly added message
            messagesRecyclerView.post(() -> {
                int totalItemsNew = repliesAdapter.getItemCount();
                if (totalItemsNew > 0) {
                    // Scroll to last position (totalItems - 1, since positions are 0-indexed)
                    int lastPosition = totalItemsNew - 1;


                    // Alternative: use smooth scroll if you prefer
                     messagesRecyclerView.smoothScrollToPosition(lastPosition);

                    showContent();
                }
            });
        });

        // Provide haptic feedback (vibration)
        if (sendButton != null) {
            sendButton.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
        }

        // Provide haptic feedback (vibration)
        if (sendButton != null) {
            sendButton.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
        }

        // Mark as sending after UI is updated
        isSending = true;
        sendButton.setEnabled(false);
        messageInput.setEnabled(false);

        // Prepare request body
        JSONObject jsonBody = new JSONObject();
        try {
            jsonBody.put("articleId", articleId);
            jsonBody.put("title", "");
            jsonBody.put("content", apiContent);
            Log.d("content:",apiContent);
            jsonBody.put("parentCommentId", parentCommentId);
            if (currentReplyingTo != null) {
                jsonBody.put("replyMessageId", currentReplyingTo.getId());
            }
            if(currentEmotion!=null){
                jsonBody.put("emotion", currentEmotion);
                currentEmotion=null;
            }
            clearReplyingState();
        } catch (JSONException e) {
            handleSendError(optimisticMessage, e, content);
            return;
        }

        // Create the request
        RequestBody body = RequestBody.create(
                MediaType.parse("application/json"),
                jsonBody.toString()
        );

        Request request = new Request.Builder()
                .url("https://api.typepilot.app/v1/room/addcommentnew")
                .post(body)
                .addHeader("Content-Type", "application/json")
                .addHeader("Authorization", "Bearer " + access)
                .build();

        // Execute the request
        getOkHttpClient().newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
               runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                    if (isFinishing() || isDestroyed()) return;
                    handleSendError(optimisticMessage, e, content);
                });
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) {
                try {
                    if (!response.isSuccessful()) {
                        throw new IOException("Unexpected code " + response);
                    }

                    String responseData = response.body().string();
                    JSONObject jsonResponse = new JSONObject(responseData);

                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        try {
                            if (isFinishing() || isDestroyed()) return;

                            // Get real message from server
                            Opinion realMessage = ThreadRepliesAdapter.fromApiComment(
                                    jsonResponse.getJSONObject("comment"), currentUserId);

                            // Replace optimistic message with real one
                            replaceOptimisticMessage(tempId, realMessage);

                            // Play success sound
                            playMessageSound(R.raw.sent);

                            // Update replies count
                            updateRepliesCount(1);

                            // Reset UI state
                            resetMessageUI();

                            HistoryManager.getInstance().trackCommentCreated(String.valueOf(articleId),realMessage.getId(),realMessage.getMessage(),title,String.valueOf(realMessage.getParentCommentId()),"",0,0,"",0,0,"Conversation Room");


                        } catch (JSONException e) {
                            handleSendError(optimisticMessage, e, content);
                        }
                    });
                } catch (Exception e) {
                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        if (isFinishing() || isDestroyed()) return;
                        handleSendError(optimisticMessage, e, content);
                    });
                }
            }
        });
    }

    private void handleJoinError(String errorMessage, String originalContent) {
        isSending = false;
        sendButton.setEnabled(true);
        messageInput.setEnabled(true);
        hideInlineLoadingForJoin();

        Toast.makeText(ThreadReplyActivityOnline.this, errorMessage, Toast.LENGTH_SHORT).show();

        // Restore the original message content so user doesn't lose their text
        if (originalContent != null && !originalContent.trim().isEmpty()) {
            messageInput.setText(originalContent);
            messageInput.setSelection(messageInput.getText().length());
        }
    }

    private void showInlineLoadingForJoin() {
        // Show a subtle loading indicator in the message input area
        messageInput.setHint("Joining room...");

        // You could also show a small progress indicator
        TextInputLayout messageInputLayout = findViewById(R.id.threadMessageInputLayout);
        if (messageInputLayout != null) {
            messageInputLayout.setHelperText("Joining room to send your reply...");
        }
    }

    private void hideInlineLoadingForJoin() {
        messageInput.setHint("Reply in thread...");

        TextInputLayout messageInputLayout = findViewById(R.id.threadMessageInputLayout);
        if (messageInputLayout != null) {
            messageInputLayout.setHelperText(null);
        }
    }

    private void showJoinSuccessMessage() {
        // Show a brief, non-intrusive success message
        Snackbar.make(messagesRecyclerView, "Joined room successfully!", Snackbar.LENGTH_SHORT)
                .setBackgroundTint(ContextCompat.getColor(this, R.color.success_green))
                .show();
    }

    private void sendReply(String content) {
        if (isSending) return;

        // Check if user needs to join first
        if (needsToJoin && !isPrivate) {
            // Auto-join and then send reply
            autoJoinAndSendReply(content);
            return;
        }


        // Get API content before disabling the input
        String apiContent = messageInput.getTextForSubmission();

        // Create and display optimistic message immediately
        String tempId = "temp_" + System.currentTimeMillis();
        Opinion optimisticMessage = new Opinion.Builder()
                .setId(tempId)
                .setSenderId(currentUserId)
                .setSenderName("You")
                .setMiniMessage("")
                .setMessage(content)
                .setTimestamp(System.currentTimeMillis())
                .setStatus(MessageStatus.SENT)
                .setParentCommentId(parentCommentId)
                .build();

        if (currentReplyingTo != null) {
            optimisticMessage.setReplyid(Integer.parseInt(currentReplyingTo.getId()));
            optimisticMessage.setReplyusername(currentReplyingTo.getSenderName());
            optimisticMessage.setReplycontent(currentReplyingTo.getMessage());
        }

        // Clear input immediately for instant user feedback
        messageInput.setText("");


        // Add to UI immediately and force refresh
        List<Opinion> currentList = new ArrayList<>(repliesAdapter.getCurrentList());
        currentList.add(optimisticMessage);
        repliesAdapter.submitList(currentList,()->{
            int totalItems = repliesAdapter.getItemCount();
            if (totalItems > 0) {
                int lastPosition = totalItems;
                // Scroll to last position (totalItems - 1, since positions are 0-indexed)
                smoothScrollToPositionNew(lastPosition);
            }
        });

        // Provide haptic feedback (vibration)
        if (sendButton != null) {
            sendButton.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
        }

        // Mark as sending after UI is updated
        isSending = true;
        sendButton.setEnabled(false);
        messageInput.setEnabled(false);

        // Prepare request body
        JSONObject jsonBody = new JSONObject();
        try {
            jsonBody.put("articleId", articleId);
            jsonBody.put("title", "");
            jsonBody.put("content", apiContent);
            Log.d("content:",apiContent);
            jsonBody.put("parentCommentId", parentCommentId);
            if (currentReplyingTo != null) {
                jsonBody.put("replyMessageId", currentReplyingTo.getId());
            }
            if(currentEmotion!=null){
                jsonBody.put("emotion", currentEmotion);
                currentEmotion=null;
            }
            clearReplyingState();
        } catch (JSONException e) {
            handleSendError(optimisticMessage, e, content);
            return;
        }

        // Create the request
        RequestBody body = RequestBody.create(
                MediaType.parse("application/json"),
                jsonBody.toString()
        );

        Request request = new Request.Builder()
                .url("https://api.typepilot.app/v1/room/addcommentnew")
                .post(body)
                .addHeader("Content-Type", "application/json")
                .addHeader("Authorization", "Bearer " + access)
                .build();

        // Execute the request
        getOkHttpClient().newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
               runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                    if (isFinishing() || isDestroyed()) return;
                    handleSendError(optimisticMessage, e, content);
                });
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) {
                try {
                    if (!response.isSuccessful()) {
                        if (response.code() == 403) {
                            // 403 Forbidden - User doesn't have access
                           runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                                // Remove optimistic message
                                handleSendError(optimisticMessage, new IOException("Access denied"), content);

                                // Check room privacy status to determine if join is possible
                                if (!isPrivate) {
                                    // Set the preserved message and show join dialog
                                    preservedMessage = content;
                                    showJoinRoomDialog(isPrivate, preservedMessage);
                                } else {
                                    Toast.makeText(ThreadReplyActivityOnline.this,
                                            "This room is private. You need an invitation to join.",
                                            Toast.LENGTH_LONG).show();
                                    // Restore the message for user to see what they tried to send
                                    restorePreservedMessage(content);
                                }
                            });
                            return;
                        }
                        throw new IOException("Unexpected code " + response);
                    }

                    String responseData = response.body().string();
                    JSONObject jsonResponse = new JSONObject(responseData);

                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        try {
                            if (isFinishing() || isDestroyed()) return;

                            // Get real message from server
                            Opinion realMessage = ThreadRepliesAdapter.fromApiComment(
                                    jsonResponse.getJSONObject("comment"), currentUserId);


                            // Replace optimistic message with real one
                            replaceOptimisticMessage(tempId, realMessage);

                            // Play success sound
                            playMessageSound(R.raw.sent);

                            // Update replies count
                            updateRepliesCount(1);

                            // Reset UI state
                            resetMessageUI();

                            HistoryManager.getInstance().trackCommentCreated(String.valueOf(articleId),realMessage.getId(),realMessage.getMessage(),title,String.valueOf(realMessage.getParentCommentId()),"",0,0,"",0,0,"Conversation Room");
                            manager.join("commented");

                        } catch (JSONException e) {
                            handleSendError(optimisticMessage, e, content);
                        }
                    });
                } catch (Exception e) {
                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        if (isFinishing() || isDestroyed()) return;
                        handleSendError(optimisticMessage, e, content);
                    });
                }
            }
        });
    }

    // Update the handleSendError method to preserve the message
    private void handleSendError(Opinion optimisticMessage, Throwable error, String originalContent) {
        // Remove optimistic message
        List<Opinion> currentList = new ArrayList<>(repliesAdapter.getCurrentList());

        // Find and remove the message by ID
        for (int i = 0; i < currentList.size(); i++) {
            if (currentList.get(i).getId().equals(optimisticMessage.getId())) {
                currentList.remove(i);
                break;
            }
        }

        // Update the list
        repliesAdapter.submitList(currentList);

        // Show error message
        Toast.makeText(this, "Failed to send message: " + error.getMessage(),
                Toast.LENGTH_SHORT).show();

        // Reset UI state
        resetMessageUI();

        // Restore the original message content so user doesn't lose their text
        if (originalContent != null && !originalContent.trim().isEmpty()) {
            messageInput.setText(originalContent);
            messageInput.setSelection(messageInput.getText().length());
        }
    }

    /**
     * Inserts the optimistic message into a copy of the current list at the
     * correct chronological spot, submits the list, and scrolls to it.
     */


    private void replaceOptimisticMessage(String tempId, Opinion realMessage) {
        List<Opinion> updatedList = new ArrayList<>(repliesAdapter.getCurrentList());
        boolean replacedMessage = false;
        int replacedPosition = -1;

        // Find the optimistic message
        Opinion optimisticMessage = null;
        for (Opinion opinion : updatedList) {
            if (opinion.getId().equals(tempId)) {
                optimisticMessage = opinion;
                break;
            }
        }

        // Find and replace the optimistic message
        for (int i = 0; i < updatedList.size(); i++) {
            Opinion current = updatedList.get(i);
            if (current.getId().equals(tempId)) {
                replacedPosition = i;

                // Create a delivered version of the real message
                Opinion.Builder builder = new Opinion.Builder()
                        .setId(realMessage.getId())
                        .setSenderId(realMessage.getSenderId())
                        .setProfileImage(realMessage.getProfileImage())
                        .setSenderName(realMessage.getSenderName())
                        .setMessage(realMessage.getMessage())
                        .setQuote(realMessage.getQuote())
                        .setEmotion(realMessage.getEmotion())
                        .setMiniMessage(realMessage.getminimessage())
                        .setTimestamp(realMessage.getTimestamp())
                        .setTitle(realMessage.getTitle())
                        .setReactions(realMessage.getReactions())
                        .setUserReaction(realMessage.getUserReaction())
                        .setchild_comment_count(realMessage.getChild_comment_count())
                        .setParentCommentId(realMessage.getParentCommentId())
                        .setParentContent(realMessage.getParentContent())
                        .setParentUserName(realMessage.getParentUserName())
                        .setStatus(MessageStatus.DELIVERED)
                        .setEdited(realMessage.isEdited());

                // Carefully preserve reply information
                // First check if the real message has reply info
                if (realMessage.getReplyid() != -1) {
                    builder.setReplyid(realMessage.getReplyid())
                            .setReplyusername(realMessage.getReplyusername())
                            .setReplycontent(realMessage.getReplycontent());
                }
                // If not, check if the optimistic message had reply info
                else if (optimisticMessage != null && optimisticMessage.getReplyid() != -1) {
                    builder.setReplyid(optimisticMessage.getReplyid())
                            .setReplyusername(optimisticMessage.getReplyusername())
                            .setReplycontent(optimisticMessage.getReplycontent());

                    // Log that we're preserving the reply info from the optimistic message
                    Log.d("ReplaceMessage", "Preserving reply info from optimistic message: " +
                            "replyId=" + optimisticMessage.getReplyid() +
                            ", username=" + optimisticMessage.getReplyusername());
                }

                // Replace the temp message with the real one
                updatedList.set(i, builder.build());
                replacedMessage = true;
                break;
            }
        }

        // If we couldn't find the temp message, add the real one
        if (!replacedMessage) {
            // Create a delivered version of the real message
            Opinion.Builder builder = new Opinion.Builder()
                    .setId(realMessage.getId())
                    .setSenderId(realMessage.getSenderId())
                    .setProfileImage(realMessage.getProfileImage())
                    .setSenderName(realMessage.getSenderName())
                    .setMessage(realMessage.getMessage())
                    .setQuote(realMessage.getQuote())
                    .setEmotion(realMessage.getEmotion())
                    .setTimestamp(realMessage.getTimestamp())
                    .setTitle(realMessage.getTitle())
                    .setMiniMessage(realMessage.getminimessage())
                    .setReactions(realMessage.getReactions())
                    .setUserReaction(realMessage.getUserReaction())
                    .setchild_comment_count(realMessage.getChild_comment_count())
                    .setParentCommentId(realMessage.getParentCommentId())
                    .setParentContent(realMessage.getParentContent())
                    .setParentUserName(realMessage.getParentUserName())
                    .setStatus(MessageStatus.DELIVERED)
                    .setEdited(realMessage.isEdited());

            // Preserve reply information from real message if available
            if (realMessage.getReplyid() != -1) {
                builder.setReplyid(realMessage.getReplyid())
                        .setReplyusername(realMessage.getReplyusername())
                        .setReplycontent(realMessage.getReplycontent());
            }

            // Add to the END of the list (for newest messages)
            // Most chat apps show newest messages at the bottom
            updatedList.add(builder.build());
            replacedPosition = updatedList.size() - 1;

            Log.d("ReplaceMessage", "Temp message not found, added real message to end at position: " + replacedPosition);
        }

        // Submit updated list - NO position offset calculations needed!
        if (replacedPosition != -1) {
            Log.d("ReplaceMessage", "Replacing message at position: " + replacedPosition +
                    ", temp ID: " + tempId + ", real ID: " + realMessage.getId());

            boolean finalReplacedMessage = replacedMessage;
            int finalReplacedPosition = replacedPosition;
            repliesAdapter.submitList(updatedList, () -> {
                // Simply notify the change at the actual position in the replies adapter
                // ConcatAdapter will handle the overall positioning automatically
                repliesAdapter.notifyItemChanged(finalReplacedPosition);

                // Scroll to the message if it was added (not replaced)
                if (!finalReplacedMessage) {
                    // Auto-scroll to the newest message - ADD NULL CHECK HERE
                    messagesRecyclerView.post(() -> {
                        // Check if concatAdapter is not null before using it
                        if (concatAdapter != null) {
                            // Get total items in concat adapter and scroll to last position
                            int totalItems = concatAdapter.getItemCount();
                            if (totalItems > 0) {
                                messagesRecyclerView.smoothScrollToPosition(totalItems - 1);
                            }
                        } else {
                            Log.w("ReplaceMessage", "ConcatAdapter is null, cannot auto-scroll");
                            // Alternative: scroll to the position in the replies adapter
                            if (messagesRecyclerView != null) {
                                messagesRecyclerView.smoothScrollToPosition(finalReplacedPosition);
                            }
                        }
                    });
                }
            });
        } else {
            // Fallback: just submit the list
            repliesAdapter.submitList(updatedList);
        }
    }

    // Updated handleSendError method
    private void handleSendError(Opinion optimisticMessage, Throwable error) {
        // Remove optimistic message
        List<Opinion> currentList = new ArrayList<>(repliesAdapter.getCurrentList());

        // Find and remove the message by ID
        for (int i = 0; i < currentList.size(); i++) {
            if (currentList.get(i).getId().equals(optimisticMessage.getId())) {
                currentList.remove(i);
                break;
            }
        }

        // Update the list
        repliesAdapter.submitList(currentList);

        // Show error message
        Toast.makeText(this, "Failed to send message: " + error.getMessage(),
                Toast.LENGTH_SHORT).show();

        // Reset UI state
        resetMessageUI();
    }

    // Separate method for the actual API call
    private void sendMessageToServer(JSONObject jsonBody, Opinion optimisticMessage) {
        RequestBody body = RequestBody.create(
                MediaType.parse("application/json"),
                jsonBody.toString()
        );

        Request request = new Request.Builder()
                .url("https://api.typepilot.app/v1/room/addcommentnew")
                .post(body)
                .addHeader("Content-Type", "application/json")
                .addHeader("Authorization", "Bearer " + access)
                .build();

        // Reuse a shared OkHttpClient instance with proper timeouts
        getOkHttpClient().newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
               runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                    if (isFinishing() || isDestroyed()) return;
                    handleSendError(optimisticMessage, e);
                });
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) {
                try {
                    if (!response.isSuccessful()) {
                        throw new IOException("Unexpected code " + response);
                    }

                    String responseData = response.body().string();
                    JSONObject jsonResponse = new JSONObject(responseData);

                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        try {
                            if (isFinishing() || isDestroyed()) return;
                            // Silently replace optimistic message with real one
                            Opinion realMessage = ThreadRepliesAdapter.fromApiComment(
                                    jsonResponse.getJSONObject("comment"), currentUserId);

                            HistoryManager.getInstance().trackCommentCreated(String.valueOf(articleId),realMessage.getId(),realMessage.getMessage(),title,String.valueOf(realMessage.getParentCommentId()),"",0,0,"",0,0,"Conversation Room");

                            List<Opinion> updatedList = new ArrayList<>(repliesAdapter.getCurrentList());
                            int optimisticIndex = findMessageIndex(updatedList, optimisticMessage.getId());
                            if (optimisticIndex != -1) {
                                updatedList.set(optimisticIndex, realMessage);
                                repliesAdapter.submitList(updatedList);

                                // Play success sound
                                playMessageSound(R.raw.sent);

                                // Update replies count
                                updateRepliesCount(1);
                            }
                        } catch (JSONException e) {
                            handleSendError(optimisticMessage, e);
                        }

                        // Reset UI state
                        resetMessageUI();

                    });
                } catch (Exception e) {
                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        if (isFinishing() || isDestroyed()) return;
                        handleSendError(optimisticMessage, e);
                    });
                }
            }
        });
    }

    // Add a singleton OkHttpClient
    private OkHttpClient getOkHttpClient() {
        if (httpClient == null) {
            httpClient = new OkHttpClient.Builder()
                    .connectTimeout(10, TimeUnit.SECONDS)
                    .readTimeout(10, TimeUnit.SECONDS)
                    .writeTimeout(10, TimeUnit.SECONDS)
                    .build();
        }
        return httpClient;
    }


    private void resetMessageUI() {
        isSending = false;
        sendButton.setEnabled(true);
        messageInput.setEnabled(true);
        messageInput.clearText();
        messageInput.setText("");
    }

    private void ensureContentVisible() {
        // If we were showing empty state but now have items, show content
        if (emptyStateView.getVisibility() == View.VISIBLE && repliesAdapter.getItemCount() > 0) {
            showContent();
        }
    }


    private int findMessageIndex(List<Opinion> messages, String messageId) {
        for (int i = 0; i < messages.size(); i++) {
            if (messages.get(i).getId().equals(messageId)) {
                return i;
            }
        }
        return -1;
    }

    private void updateRepliesCount(int increment) {
        if(increment>1 && firstdone){
            return;
        }
        if(increment>1){
            firstdone=true;
        }
        replies += increment;
        String repliesText = replies == 1 ? "1 reply" : replies + " replies";

        // FIX: Add null check and activity lifecycle check
        if (repliesCountText != null && !isFinishing() && !isDestroyed()) {
            repliesCountText.setText(repliesText);
        }
    }

    private void playMessageSound(int soundResource) {
        if (messageSound != null) {
            try {
                if (messageSound.isPlaying()) {
                    messageSound.stop();
                    messageSound.reset();
                }
                messageSound = MediaPlayer.create(this, soundResource);
                messageSound.setVolume(0.3f, 0.3f);
                messageSound.start();
            } catch (Exception e) {
                // Ignore sound errors
            }
        }
    }



    /**
     * Initializes and connects to the WebSocket server with improved error handling,
     * connection status monitoring, and automatic reconnection.
     */
    private void initializeSocket() {
        try {
            // Clean up any existing socket connection
            if (socket != null) {
                socket.off();
                socket.disconnect();
            }

            // Configure socket options with better defaults
            IO.Options options = new IO.Options();
            options.query = "token=" + access;
            options.reconnection = true;
            options.reconnectionAttempts = RECONNECTION_ATTEMPTS;
            options.reconnectionDelay = RECONNECTION_DELAY;
            options.timeout = CONNECTION_TIMEOUT;
            options.forceNew = true;

            socket = IO.socket("wss://api.typepilot.app", options);

            // Setup connection event handlers
            setupSocketEventHandlers();

            // Connect to socket
            Log.d("ThreadReplyActivity", "Attempting to connect to socket");
            socket.connect();
        } catch (Exception e) {
            Log.e("ThreadReplyActivity", "Error initializing socket", e);
            // Show error to user
            showConnectionError(e.getMessage());
        }
    }

    /**
     * Sets up all socket event handlers for connection monitoring and data handling
     */
    private void setupSocketEventHandlers() {
        // Connection event handlers
        socket.on(Socket.EVENT_CONNECT, args -> {
            Log.d("ThreadReplyActivity", "Socket connected successfully");
            isSocketConnected = true;

            // Join the article room after successful connection
            joinArticleRoom();

            // Update UI to indicate connection
            runOnUiThread(this::hideConnectionError);
        });

        socket.on(Socket.EVENT_CONNECT_ERROR, args -> {
            isSocketConnected = false;
            String errorMessage = args.length > 0 ? args[0].toString() : "Unknown connection error";
            Log.e("ThreadReplyActivity", "Socket connection error: " + errorMessage);

            // Show error in UI
            runOnUiThread(() -> showConnectionError("Connection error: " + errorMessage));
        });

        socket.on(Socket.EVENT_DISCONNECT, args -> {
            isSocketConnected = false;
            Log.d("ThreadReplyActivity", "Socket disconnected");

            // Update UI to show disconnected state
            runOnUiThread(() -> showDisconnectedMessage());
        });



        socket.on(Socket.EVENT_CONNECT_ERROR, args -> {
            Log.e("ThreadReplyActivity", "Socket reconnection failed after maximum attempts");
            isSocketConnected = false;
            // Show permanent error message
            runOnUiThread(() -> showPermanentConnectionError());
        });

        // Business logic event handlers
        setupBusinessEventHandlers();
    }

    /**
     * Sets up event handlers for business-specific socket events
     */

    private void handleCommentDeleted(Object[] args) {
       runOnUiThread(() -> {
                    if (!isUiSafe()) return;
            try {
                if (args.length > 0 && args[0] instanceof JSONObject) {
                    JSONObject data = (JSONObject) args[0];
                    String deletedCommentId = data.getString("commentId");


                    // Update comment to show it's deleted
                    if (repliesAdapter != null) {
                        boolean wasUpdated = repliesAdapter.markCommentAsDeleted(
                                deletedCommentId,
                                "This comment has been deleted",
                                ""
                        );

                    }
                }
            } catch (JSONException e) {
                e.printStackTrace();
            }
        });
    }

    private void setupBusinessEventHandlers() {


        socket.on("comment_deleted", args -> handleCommentDeleted(args));

        // Listen for new comments
        socket.on("comment_added", args -> {
            if (args.length == 0 || args[0] == null) {
                Log.w("ThreadReplyActivity", "Received empty comment_added event");
                return;
            }
            try {
                JSONObject data = (JSONObject) args[0];
                JSONObject commentJson = data.getJSONObject("comment");
                int commentParentId = commentJson.optInt("parent_comment_id", -1);

               // Only process comments that are replies to our parent comment
                if (commentParentId == parentCommentId) {
                    // Convert to Opinion object

                    Opinion newComment = ThreadRepliesAdapter.fromApiComment(commentJson, currentUserId);

                    // Update UI on main thread
                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        if (isFinishing() || isDestroyed()) {
                            return;
                        }

                        // Check if comment already exists in our list
                        List<Opinion> currentList = new ArrayList<>(repliesAdapter.getCurrentList());
                        for (Opinion opinion : currentList) {
                            if (opinion.getId().equals(newComment.getId())) {
                                // Comment already exists
                                return;
                            }
                        }

                        // Add new comment if it's not from current user
                        if (!newComment.getSenderId().equals(currentUserId)) {
                            currentList.add(newComment);// Add to beginning
                            repliesAdapter.submitList(currentList);

                            // Play notification sound
                            playMessageSound(R.raw.sent);

                            // Update the replies count
                            updateRepliesCount(1);
                        }
                    });
                }
            } catch (JSONException e) {
                Log.e("ThreadReplyActivity", "Error parsing comment_added event", e);
            }
        });

        // Listen for reactions to update UI
        socket.on("reaction_updated", args -> {
            if (args.length == 0 || args[0] == null) {
                Log.w("ThreadReplyActivity", "Received empty reaction_updated event");
                return;
            }

            try {
                JSONObject data = (JSONObject) args[0];
                String targetId = data.getString("target_id");
                String targetType = data.getString("target_type");

                if (!"comment".equals(targetType)) {
                    return;
                }

                // If the reaction is for the parent comment
                if (String.valueOf(parentCommentId).equals(targetId)) {
                    JSONArray reactionsSummary = data.getJSONArray("reactions_summary");
                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        if (!isFinishing() && !isDestroyed()) {
                            updateParentReactions(reactionsSummary);
                        }
                    });
                } else {
                    // If the reaction is for a reply
                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        if (!isFinishing() && !isDestroyed()) {
                            repliesAdapter.updateReactionFromSocket(targetId, data);
                        }
                    });
                }
            } catch (JSONException e) {
                Log.e("ThreadReplyActivity", "Error handling reaction_updated event", e);
            }
        });
    }

    /**
     * Join the article room
     */
    private void joinArticleRoom() {
        if (articleId <= 0) {
            Log.e("ThreadReplyActivity", "Cannot join article room: invalid articleId " + articleId);
            return;
        }

        try {
            JSONObject joinData = new JSONObject();
            joinData.put("articleId", articleId);
            Log.d("ThreadReplyActivity", "Joining article room: " + articleId);
            if (socket != null && socket.connected()) {
                socket.emit("join_article", joinData.toString());
            } else {
                Log.w("Socket", "Cannot emit - socket not connected");
            }
//            loadNewerMessagesUsingExistingAPI();
        } catch (JSONException e) {
            Log.e("ThreadReplyActivity", "Error creating join_article payload", e);
        }
    }

    /**
     * Shows a connection error message to the user
     */
    private void showConnectionError(String errorMessage) {
        // Use Toast instead of a dedicated view
//        Toast.makeText(this, "Connection issue: " + errorMessage, Toast.LENGTH_SHORT).show();

        // Or use Snackbar

    }

    /**
     * Hides the connection error message
     */
    private void hideConnectionError() {
        // Implementation depends on your UI

    }

    /**
     * Shows a disconnected message
     */
    private void showDisconnectedMessage() {
        // Implementation depends on your UI

    }

    /**
     * Shows a permanent connection error after all reconnection attempts fail
     */
    private void showPermanentConnectionError() {
        // Implementation depends on your UI
//        Toast.makeText(this, "Permanent Connection issue: ", Toast.LENGTH_SHORT).show();
    }

    private void updateParentReactions(JSONArray reactionsSummary) {
        try {
            int totalReactions = 0;
            String primaryReactionType = "like"; // default
            int maxCount = 0;

            // Calculate totals and find primary reaction
            for (int i = 0; i < reactionsSummary.length(); i++) {
                JSONObject reaction = reactionsSummary.getJSONObject(i);
                String type = reaction.getString("reaction_type");
                int count = reaction.getInt("count");
                totalReactions += count;

                // Find the reaction type with highest count
                if (count > maxCount) {
                    maxCount = count;
                    primaryReactionType = type;
                }
            }

            final int finalCount = totalReactions;
            final String finalType = primaryReactionType;

            runOnUiThread(() -> {
                if (!isUiSafe() || isFinishing() || isDestroyed()) {
                    return;
                }

                // Update parent card data if it exists
                if (parentCardAdapter != null && parentCardAdapter.hasParentCard()) {
                    ParentCardAdapter.ParentCardData currentData = getCurrentParentCardData();

                    if (currentData != null) {
                        // Preserve user's own reaction state - only update counts
                        String currentUserReaction = currentData.getUserReaction();
                        boolean currentUserReacted = currentData.isUserReacted();

                        // Update reaction counts and primary emoji
                        currentData.setReactionCount(finalCount);
                        currentData.setHasReactions(finalCount > 0);

                        // Update primary emoji (show user's reaction if they reacted, otherwise most common)
                        if (currentUserReacted && currentUserReaction != null) {
                            // Keep showing user's reaction emoji
                            String userEmoji = getReactionEmoji(currentUserReaction);
                            if (userEmoji != null) {
                                currentData.setPrimaryReactionEmoji(userEmoji);
                            }
                        } else {
                            // Show most common reaction emoji
                            String primaryEmoji = getReactionEmoji(finalType);
                            if (primaryEmoji != null) {
                                currentData.setPrimaryReactionEmoji(primaryEmoji);
                            }
                        }

                        // Trigger UI update
                        parentCardAdapter.setParentCardData(currentData);

                        Log.d("ThreadReplyActivity", "Updated parent reactions - Count: " + finalCount +
                                ", Primary: " + finalType + ", User reacted: " + currentUserReacted);
                    }
                }
            });
        } catch (JSONException e) {
            Log.e("ThreadReplyActivity", "Error updating parent reactions", e);
        }
    }

    private ParentCardAdapter.ParentCardData getCurrentParentCardData() {
        // You'll need to add a getter method to ParentCardAdapter
        // For now, you can store it as a field in your activity
        return parentCardAdapter.getCurrentParentCardData(); // This should be a field in your activity
    }


    private String getReactionEmoji(String reactionType) {
        Map<String, String> reactions = new HashMap<String, String>() {{
            put("like", "👍");
            put("love", "❤️");
            put("curious", "🤔");
            put("insightful", "💡");
            put("celebrate", "🎉");
            put("support", "🤝");
            put("funny", "😂");
            put("surprised", "😮");
            put("sad", "😢");
            put("angry", "😠");
        }};

        return reactions.get(reactionType);
    }

    private void showParentReactionsBottomSheet() {
        // Create and show a reaction bottom sheet for the parent comment
        ReactionBottomSheet bottomSheet = new ReactionBottomSheet();
        bottomSheet.setTargetId(String.valueOf(parentCommentId));
        bottomSheet.setUserId(currentUserId);
        bottomSheet.setCommentOwnerId(String.valueOf(commentuserid));
        bottomSheet.setTargetType("comment");


        // We need to make sure the user's current reaction is highlighted in the bottom sheet
        OkHttpClient client = new OkHttpClient();
        JSONObject jsonBody = new JSONObject();
        try {
            jsonBody.put("target_type", "comment");
            jsonBody.put("target_id", parentCommentId);
        } catch (JSONException e) {
            e.printStackTrace();
            bottomSheet.show(getSupportFragmentManager(), "parentReactions");
            return;
        }

        RequestBody body = RequestBody.create(
                MediaType.parse("application/json"),
                jsonBody.toString()
        );

        Request request = new Request.Builder()
                .url("https://api.typepilot.app/v1/room/reaction_status")
                .post(body)
                .addHeader("Content-Type", "application/json")
                .addHeader("Authorization", "Bearer " + access)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
               runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                    if (isFinishing() || isDestroyed()) {
                        return;
                    }
                    // Show the bottom sheet even if we can't get the current reaction
                    bottomSheet.show(getSupportFragmentManager(), "parentReactions");
                });
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                if (!response.isSuccessful()) {
                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        if (isFinishing() || isDestroyed()) {
                            return;
                        }
                        bottomSheet.show(getSupportFragmentManager(), "parentReactions");
                    });
                    return;
                }

                try {
                    String jsonData = response.body().string();
                    JSONObject jsonObject = new JSONObject(jsonData);

                    final String userReaction = jsonObject.optString("user_reaction", null);

                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        if (isFinishing() || isDestroyed()) {
                            return;
                        }
                        // Set the current reaction before showing the sheet
                        if (userReaction != null && !userReaction.isEmpty()) {
                            bottomSheet.setCurrentReaction(userReaction);
                        }

                        bottomSheet.setOnReactionSelectedListener((reactionType, isUnreact) -> {
                            // Send the reaction to the server
                            sendParentReaction(reactionType, isUnreact);
                        });

                        bottomSheet.show(getSupportFragmentManager(), "parentReactions");
                    });
                } catch (Exception e) {
                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        if (isFinishing() || isDestroyed()) {
                            return;
                        }
                        bottomSheet.show(getSupportFragmentManager(), "parentReactions");
                    });
                }
            }
        });
    }

    private void fetchParentReactionStatus(OnReactionFetchedListener listener) {
        OkHttpClient client = new OkHttpClient();
        JSONObject jsonBody = new JSONObject();
        try {
            jsonBody.put("target_type", "comment");
            jsonBody.put("target_id", parentCommentId);
        } catch (JSONException e) {
            e.printStackTrace();
            listener.onReactionFetched(null);
            return;
        }

        RequestBody body = RequestBody.create(
                MediaType.parse("application/json"),
                jsonBody.toString()
        );

        Request request = new Request.Builder()
                .url("https://api.typepilot.app/v1/room/reaction_status")
                .post(body)
                .addHeader("Content-Type", "application/json")
                .addHeader("Authorization", "Bearer " + access)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                runOnUiThread(() ->{
                    if (isFinishing() || isDestroyed()) {
                        return;
                    }
                    listener.onReactionFetched(null);
                });
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                if (!response.isSuccessful()) {
                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        if (isFinishing() || isDestroyed()) {
                            return;
                        }
                        listener.onReactionFetched(null);
                    });
                    return;
                }

                try {
                    String jsonData = response.body().string();
                    JSONObject jsonObject = new JSONObject(jsonData);

                    final String userReaction = jsonObject.optString("user_reaction", null);

                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        if (isFinishing() || isDestroyed()) {
                            return;
                        }
                        listener.onReactionFetched(userReaction);
                    });
                } catch (Exception e) {
                    e.printStackTrace();
                    runOnUiThread(() ->{
                        if (isFinishing() || isDestroyed()) {
                            return;
                        }
                        listener.onReactionFetched(null);
                    });
                }
            }
        });
    }

    private void sendParentReaction(String reactionType, boolean isUnreact) {
        // Update UI optimistically
//        updateParentReactionUI(reactionType, isUnreact);

        // Send to server
        OkHttpClient client = new OkHttpClient();
        JSONObject jsonBody = new JSONObject();
        try {
            jsonBody.put("target_type", "comment");
            jsonBody.put("target_id", parentCommentId);
            jsonBody.put("reaction_type", reactionType);
        } catch (JSONException e) {
            e.printStackTrace();
            return;
        }

        RequestBody body = RequestBody.create(
                MediaType.parse("application/json"),
                jsonBody.toString()
        );

        String url = isUnreact ?
                "https://api.typepilot.app/v1/room/unreact" :
                "https://api.typepilot.app/v1/room/react";

        Request request = new Request.Builder()
                .url(url)
                .post(body)
                .addHeader("Content-Type", "application/json")
                .addHeader("Authorization", "Bearer " + access)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                // Revert UI on failure
                runOnUiThread(() ->{
                    if (isFinishing() || isDestroyed()) {
                        return;
                    }
                    Toast.makeText(ThreadReplyActivityOnline.this,
                            "Failed to update reaction", Toast.LENGTH_SHORT).show();
                });
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                if (!response.isSuccessful()) {
                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        if (isFinishing() || isDestroyed()) {
                            return;
                        }
                        Toast.makeText(ThreadReplyActivityOnline.this,
                                "Failed to update reaction", Toast.LENGTH_SHORT).show();
                    });
                    return;
                }

                try {
                    String jsonData = response.body().string();
                    JSONObject jsonObject = new JSONObject(jsonData);

                    boolean success = jsonObject.optBoolean("success", false);

                    if (success && jsonObject.has("reactions_summary")) {
                        JSONArray reactionsSummary = jsonObject.getJSONArray("reactions_summary");
                        updateParentReactions(reactionsSummary);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });
    }



    private String getEmojiForReactionType(String type) {
        switch (type) {
            case "like": return "👍";
            case "love": return "❤️";
            case "curious": return "🤔";
            case "insightful": return "💡";
            case "celebrate": return "🎉";
            case "support": return "🤝";
            case "funny": return "😂";
            case "surprised": return "😮";
            case "sad": return "😢";
            case "angry": return "😠";
            default: return "👍";
        }
    }

    interface OnReactionFetchedListener {
        void onReactionFetched(String reactionType);
    }

    private void fetchInitialReactionStatus() {
        OkHttpClient client = new OkHttpClient();
        JSONObject jsonBody = new JSONObject();
        try {
            jsonBody.put("target_type", "comment");
            jsonBody.put("target_id", parentCommentId);
        } catch (JSONException e) {
            e.printStackTrace();
            return;
        }

        RequestBody body = RequestBody.create(
                MediaType.parse("application/json"),
                jsonBody.toString()
        );

        Request request = new Request.Builder()
                .url("https://api.typepilot.app/v1/room/reaction_status")
                .post(body)
                .addHeader("Content-Type", "application/json")
                .addHeader("Authorization", "Bearer " + access)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                Log.e("ThreadReplyActivity", "Failed to fetch initial reaction status", e);
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                if (!response.isSuccessful()) {
                    return;
                }

                try {
                    String jsonData = response.body().string();
                    JSONObject jsonObject = new JSONObject(jsonData);

                    String userReaction = null;
                    if (jsonObject.has("user_reaction") && !jsonObject.isNull("user_reaction")) {
                        userReaction = jsonObject.getString("user_reaction");
                    }

                    // Get the primary reaction type to display
                    String primaryReactionType = null;
                    int totalReactions = 0;

                    if (jsonObject.has("reactions_summary")) {
                        JSONArray reactionsSummary = jsonObject.getJSONArray("reactions_summary");

                        // If user has reacted, use their reaction type
                        if (userReaction != null) {
                            primaryReactionType = userReaction;
                        }

                        // Otherwise find the most recent/popular reaction
                        for (int i = 0; i < reactionsSummary.length(); i++) {
                            JSONObject reaction = reactionsSummary.getJSONObject(i);
                            String type = reaction.getString("reaction_type");
                            int count = reaction.getInt("count");
                            totalReactions += count;

                            if (primaryReactionType == null) {
                                primaryReactionType = type;
                            }
                        }
                    }

                    final String finalPrimaryType = primaryReactionType != null ? primaryReactionType : "like";
                    final String finalUserReaction = userReaction;
                    final int finalTotalReactions = totalReactions;

                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        if (isFinishing() || isDestroyed()) {
                            return;
                        }
                        if (finalTotalReactions > 0) {
                            // Set emoji based on the reaction type
                            parentReactionEmoji.setText(getEmojiForReactionType(finalPrimaryType));
                            parentReactionCount.setText(String.valueOf(finalTotalReactions));

                            // Highlight if user has reacted
                            if (finalUserReaction != null) {
                                parentReactionsContainer.setStrokeColor(ContextCompat.getColor(ThreadReplyActivityOnline.this, R.color.colorAccent));
                                parentReactionsContainer.setStrokeWidth(2);
                            } else {
                                parentReactionsContainer.setStrokeColor(Color.TRANSPARENT);
                                parentReactionsContainer.setStrokeWidth(0);
                            }
                        }
                    });
                } catch (Exception e) {
                    Log.e("ThreadReplyActivity", "Error parsing initial reaction status", e);
                }
            }
        });
    }


    private void handleReactionClick(Opinion opinion) {
        // Create bottom sheet
        ReactionBottomSheet bottomSheet = new ReactionBottomSheet();
        bottomSheet.setTargetId(opinion.getId());
        bottomSheet.setArticleId(articleId);
        bottomSheet.setTargetType("comment");
        bottomSheet.setCommentOwnerId(opinion.getSenderId());
        bottomSheet.setUserId(currentUserId);
        bottomSheet.setTargetType("comment");
        bottomSheet.setCommentContent(opinion.getMessage());
        bottomSheet.setCommentTitle("");
        bottomSheet.setEditable(!(opinion.getTitle()!=null && opinion.getTitle().length()>1) && opinion.getSenderId().equals(currentUserId) && !(opinion.getMessage().equals("This comment has been deleted")||opinion.getMessage().equals("This message was deleted")));
        bottomSheet.setTargetId(opinion.getId());

        bottomSheet.setOnCommentUpdatedListener(new ReactionBottomSheet.OnCommentUpdatedListener() {
            @Override
            public void onCommentUpdated(String commentId, String newContent, String newTitle) {
                // Update your comment in the list/UI
//                updateCommentInAdapter(commentId, newContent, newTitle);
                repliesAdapter.updateComment(
                        commentId,
                        newContent,
                        ""
                );
            }
        });

        // Set the current reaction if user has already reacted
        String userReaction = opinion.getUserReaction();
        if (userReaction != null && !userReaction.isEmpty()) {
            bottomSheet.setCurrentReaction(userReaction);
        }

        bottomSheet.setOnReactionSelectedListener((reactionType, isUnreact) -> {
            // Make API call through the adapter
            repliesAdapter.updateReaction(opinion.getId(), reactionType, isUnreact, access);
            if(!isUnreact) {
                setReplyingToNew(opinion,reactionType,false);
            }
        });

        bottomSheet.show(getSupportFragmentManager(), "reactionBottomSheet");


    }

    private boolean isNightTime() {
       return true;
    }

    private void fetchHighlights() {
        OkHttpClient client = new OkHttpClient();
        JSONObject jsonBody = new JSONObject();
        try {
            jsonBody.put("article_id", articleId);
        } catch (JSONException e) {
            e.printStackTrace();
            return;
        }

        RequestBody body = RequestBody.create(
                MediaType.parse("application/json"),
                jsonBody.toString()
        );

        Request request = new Request.Builder()
                .url("https://api.typepilot.app/v1/room/highlights")
                .post(body)
                .addHeader("Content-Type", "application/json")
                .addHeader("Authorization", "Bearer " + access)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                e.printStackTrace();
               runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                    if (isFinishing() || isDestroyed()) {
                        return;
                    }
                });
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                if (!response.isSuccessful()) {
                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        if (isFinishing() || isDestroyed()) {
                            return;
                        }
                    });
                    return;
                }

                try {
                    String jsonData = response.body().string();
                    JSONObject jsonObject = new JSONObject(jsonData);
                    JSONArray highlights = jsonObject.getJSONArray("highlights");

                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        if (isFinishing() || isDestroyed()) {
                            return;
                        }
                        displayHighlights(highlights);
                    });

                } catch (Exception e) {
                    e.printStackTrace();
                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        if (isFinishing() || isDestroyed()) {
                            return;
                        }
                        Toast.makeText(ThreadReplyActivityOnline.this,
                                "Error processing highlights", Toast.LENGTH_SHORT).show();
                    });
                }
            }
        });
    }

    private void displayHighlights(JSONArray highlights) {
        try {
            // Store highlights in a list for later use
            List<JSONObject> highlightsList = new ArrayList<>();
            for (int i = 0; i < highlights.length(); i++) {
                highlightsList.add(highlights.getJSONObject(i));
            }

            // Custom method to display text with highlights and tables
            displayTextWithTablesAndHighlights(summary, highlightsList, findViewById(R.id.summaryContent));

        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    public class Result {
        public final String cleanedText;
        public final List<TableSection> tables;

        public Result(String cleanedText, List<TableSection> tables) {
            this.cleanedText = cleanedText;
            this.tables = tables;
        }
    }

    public class TableSection {
        public final int position;  // Character position in original text
        public final String[][] data;

        public TableSection(int position, String[][] data) {
            this.position = position;
            this.data = data;
        }
    }

    private Result extractTablesAndText(String input) {
        StringBuilder cleanedText = new StringBuilder();
        List<TableSection> tables = new ArrayList<>();
        String[] lines = input.split("\n");
        List<List<String>> currentTable = new ArrayList<>();
        boolean isInTable = false;
        int currentPosition = 0;
        int maxColumns = 0;

        for (String line : lines) {
            String trimmedLine = line.trim();

            if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
                if (!isInTable) {
                    isInTable = true;
                    currentTable = new ArrayList<>();
                    maxColumns = 0;
                }

                // Skip delimiter rows (containing only |, -, :, and whitespace)
                if (!trimmedLine.matches("\\|[-:\\s|]*\\|")) {
                    // Remove first and last pipe
                    String contentOnly = trimmedLine.substring(1, trimmedLine.length() - 1);

                    // Split by unescaped pipes
                    String[] columns = contentOnly.split("(?<!\\\\)\\|");

                    // Process each column
                    List<String> processedColumns = new ArrayList<>();
                    for (String column : columns) {
                        // Clean up the column content and handle escaped pipes
                        String cleaned = column.trim().replace("\\|", "|");
                        processedColumns.add(cleaned);
                    }

                    // Update max columns if this row has more
                    maxColumns = Math.max(maxColumns, processedColumns.size());
                    currentTable.add(processedColumns);
                }
            } else {
                if (isInTable) {
                    // End of table reached - normalize and store the table
                    if (!currentTable.isEmpty()) {
                        // Normalize table to ensure all rows have same number of columns
                        String[][] tableArray = normalizeTable(currentTable, maxColumns);
                        tables.add(new TableSection(currentPosition, tableArray));
                        // Add a placeholder in the cleaned text
                        cleanedText.append("[TABLE_").append(tables.size() - 1).append("]");
                        currentPosition = cleanedText.length();
                    }
                    isInTable = false;
                    currentTable.clear();
                }

                if (!trimmedLine.isEmpty()) {
                    cleanedText.append(line).append("\n");
                    currentPosition = cleanedText.length();
                }
            }
        }

        // Handle if text ends with a table
        if (isInTable && !currentTable.isEmpty()) {
            String[][] tableArray = normalizeTable(currentTable, maxColumns);
            tables.add(new TableSection(currentPosition, tableArray));
            cleanedText.append("[TABLE_").append(tables.size() - 1).append("]");
        }

        return new Result(cleanedText.toString().trim(), tables);
    }

    private String[][] normalizeTable(List<List<String>> table, int maxColumns) {
        String[][] normalizedTable = new String[table.size()][maxColumns];

        for (int i = 0; i < table.size(); i++) {
            List<String> row = table.get(i);
            for (int j = 0; j < maxColumns; j++) {
                // Fill with empty string if column doesn't exist in original row
                normalizedTable[i][j] = j < row.size() ? row.get(j) : "";
            }
        }

        return normalizedTable;
    }

    private void displayTextWithTables(String summaryText, LinearLayout contentLayout) {
        Result result = extractTablesAndText(summaryText);
        contentLayout.removeAllViews();

        String[] textParts = result.cleanedText.split("\\[TABLE_\\d+\\]");
        int tableIndex = 0;

        for (int i = 0; i < textParts.length; i++) {
            // Add text section
            if (!textParts[i].isEmpty()) {
                SelectableTextView textView = new SelectableTextView(this);

                // Use plain text without formatting
                String plainText = textParts[i].replaceAll("#", "");
                textView.setText(plainText);

                if (isNightTime() && isNightModeSwitchOn) {
                    textView.setTextColor(Color.WHITE);
                } else {
                    textView.setTextColor(Color.BLACK);
                }
                textView.setTextSize(15);
                textView.setLayoutParams(new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                ));
                contentLayout.addView(textView);
            }

            // Add table if available
            if (tableIndex < result.tables.size()) {
                HorizontalScrollView tableScroll = new HorizontalScrollView(this);
                tableScroll.setLayoutParams(new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                ));

                TableComponent tableComponent = new TableComponent(this, false);
                if (isNightTime() && isNightModeSwitchOn) {
                    tableComponent.setDarkTheme(true);
                }
                tableComponent.setData(result.tables.get(tableIndex).data);
                tableScroll.addView(tableComponent);
                contentLayout.addView(tableScroll);

                tableIndex++;
            }
        }
    }

    private void displayTextWithTablesAndHighlights(String summaryText, List<JSONObject> highlights, LinearLayout contentLayout) {
        Result result = extractTablesAndText(summaryText);
        contentLayout.removeAllViews();

        String[] textParts = result.cleanedText.split("\\[TABLE_\\d+\\]");
        int tableIndex = 0;

        for (int i = 0; i < textParts.length; i++) {
            // Add text section with highlights
            if (!textParts[i].isEmpty()) {
                SelectableTextView textView = new SelectableTextView(this);
                SpannableStringBuilder formattedText = new SpannableStringBuilder(
                        StandardParagraphFormatter.formatParagraphs(
                                textParts[i].replaceAll("#", ""),
                                isNightTime() && isNightModeSwitchOn,
                                this
                        )
                );

                // Apply highlights to this text section
                int sectionStart = getSectionStartOffset(textParts, i);
                try {
                    for (JSONObject highlight : highlights) {
                        String highlightedText = highlight.getString("highlighted_text");
                        String currentText = textParts[i];

                        // Find the text in current section
                        int startIndex = currentText.indexOf(highlightedText);

                        // Only highlight if the text is found in this section
                        if (startIndex >= 0) {
                            int endIndex = startIndex + highlightedText.length();

                            // Add subtle highlight
                            int highlightColor = Color.parseColor("#bdd1f9");
                            if(isNightModeSwitchOn && isNightTime()){
                                highlightColor = Color.parseColor("#4fa4e9");
                            }
                            BackgroundColorSpan highlightSpan = new BackgroundColorSpan(highlightColor);
                            formattedText.setSpan(
                                    highlightSpan,
                                    startIndex,
                                    endIndex,
                                    Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
                            );

                            // Add underline
                            UnderlineSpan underlineSpan = new UnderlineSpan();
                            formattedText.setSpan(
                                    underlineSpan,
                                    startIndex,
                                    endIndex,
                                    Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
                            );
                        }
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }

                textView.setText(formattedText);
                if (isNightTime() && isNightModeSwitchOn) {
                    textView.setTextColor(Color.WHITE);
                } else {
                    textView.setTextColor(Color.BLACK);
                }
                textView.setTextSize(15);
                textView.setLayoutParams(new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                ));
                contentLayout.addView(textView);
            }

            // Add table if available
            if (tableIndex < result.tables.size()) {
                HorizontalScrollView tableScroll = new HorizontalScrollView(this);
                tableScroll.setLayoutParams(new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                ));

                TableComponent tableComponent = new TableComponent(this, false);
                if (isNightTime() && isNightModeSwitchOn) {
                    tableComponent.setDarkTheme(true);
                }
                tableComponent.setData(result.tables.get(tableIndex).data);
                tableScroll.addView(tableComponent);
                contentLayout.addView(tableScroll);

                tableIndex++;
            }
        }
    }

    private int getSectionStartOffset(String[] textParts, int currentIndex) {
        int offset = 0;
        for (int i = 0; i < currentIndex; i++) {
            offset += textParts[i].length();
            // Add length of table placeholder
            offset += "[TABLE_X]".length();
        }
        return offset;
    }

    // Custom TextView that handles text selection and context menu
    public class SelectableTextView extends androidx.appcompat.widget.AppCompatTextView {
        private ActionMode.Callback actionModeCallback;

        public SelectableTextView(Context context) {
            super(context);
            init();
        }

        public SelectableTextView(Context context, AttributeSet attrs) {
            super(context, attrs);
            init();
        }

        private void init() {
            setTextIsSelectable(true);
            setupActionModeCallback();
        }

        private void setupActionModeCallback() {
            actionModeCallback = new ActionMode.Callback() {
                @Override
                public boolean onCreateActionMode(ActionMode mode, Menu menu) {
                    // Clear default menu items
                    menu.clear();

                    // Add custom menu items
                    menu.add(Menu.NONE, 1, Menu.NONE, "Reference")
                            .setIcon(R.drawable.baseline_content_copy_24);
                    menu.add(Menu.NONE, 2, Menu.NONE, "Deep Dive")
                            .setIcon(R.drawable.ic_search_white_24dp);
                    return true;
                }

                @Override
                public boolean onPrepareActionMode(ActionMode mode, Menu menu) {
                    return false;
                }

                @Override
                public boolean onActionItemClicked(ActionMode mode, MenuItem item) {
                    int start = getSelectionStart();
                    int end = getSelectionEnd();
                    String selectedText = getText().toString().substring(start, end);

                    switch (item.getItemId()) {
                        case 1: // Reference
                            handleReference(selectedText);
                            mode.finish();
                            return true;
                        case 2: // Deep Dive
                            handleDeepDive(selectedText);
                            mode.finish();
                            return true;
                    }
                    return false;
                }

                @Override
                public void onDestroyActionMode(ActionMode mode) {
                    // Handle cleanup if needed
                }
            };

            setCustomSelectionActionModeCallback(actionModeCallback);
        }

        private void handleReference(String selectedText) {
            // Implement reference action
            // Set the selected text as a reference in the reply input
            messageInput.setText("\""+selectedText+"\""+" - ");
            messageInput.setSelection(messageInput.getText().length());
        }

        private void handleDeepDive(String selectedText) {
            // Implement deep dive action
            Intent mIntent = new Intent(ThreadReplyActivityOnline.this, Assistant_Show_Message.class);
            mIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            mIntent.putExtra("text", selectedText);
            mIntent.putExtra("articleId", articleId);
            startService(mIntent);
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (socket != null && socket.connected()) {
            socket.disconnect();
        }
        if (pillHandler != null && pillHideRunnable != null) {
            pillHandler.removeCallbacks(pillHideRunnable);
        }
        if (messageSound != null) {
            messageSound.release();
            messageSound = null;
        }
        disposables.clear();

        if (socketManager != null) {
            socketManager.cleanup();
            socketManager = null;
        }
    }

    private void updateLastVisibleMessageForSync() {
        if (repliesAdapter == null || socketManager == null) return;

        List<Opinion> currentList = repliesAdapter.getCurrentList();
        if (!currentList.isEmpty()) {
            // Find the newest message
            Opinion newestMessage = null;
            long newestTimestamp = 0;

            for (Opinion opinion : currentList) {
                if (opinion.getTimestamp() > newestTimestamp) {
                    newestTimestamp = opinion.getTimestamp();
                    newestMessage = opinion;
                }
            }

            if (newestMessage != null) {
                socketManager.setLastMessageInfo(newestMessage.getId(), newestMessage.getTimestamp());
            }
        }
    }

    private void storeLastVisibleMessageInfo() {
        if (repliesAdapter != null && socketManager != null) {
            List<Opinion> currentList = repliesAdapter.getCurrentList();
            if (!currentList.isEmpty()) {
                // Find the newest message
                Opinion newestMessage = null;
                long newestTimestamp = 0;

                for (Opinion opinion : currentList) {
                    if (opinion.getTimestamp() > newestTimestamp) {
                        newestTimestamp = opinion.getTimestamp();
                        newestMessage = opinion;
                    }
                }

                if (newestMessage != null) {
                    socketManager.setLastMessageInfo(newestMessage.getId(), newestMessage.getTimestamp());
                    Log.d("ThreadReply", "📝 Stored last message for sync: " + newestMessage.getId());
                }
            }
        }

    }

    @Override
    public void onBackPressed() {
//        sendUpdatedThreadInfo();

        super.onBackPressed();
    }

    private void sendUpdatedThreadInfo() {
        Intent resultIntent = new Intent();
        resultIntent.putExtra(EXTRA_COMMENT_ID, parentCommentId);
        resultIntent.putExtra(EXTRA_REPLY_COUNT, replies);

        // Collect profile pictures from recent replies
        ArrayList<String> recentAvatars = new ArrayList<>();

        // Create a mutable copy of the current list first
        List<Opinion> currentReplies = new ArrayList<>(repliesAdapter.getCurrentList());

        // Sort the mutable copy, not the original unmodifiable list
        if (!currentReplies.isEmpty()) {
            // Sort by timestamp descending (most recent first)
            Collections.sort(currentReplies, (a, b) ->
                    Long.compare(a.getTimestamp(),b.getTimestamp() ));
        }
        // Get up to 3 unique avatar URLs from recent replies
        HashSet<String> uniqueAvatars = new HashSet<>();
        for (Opinion reply : currentReplies) {
            String avatar = reply.getProfileImage();
            if (avatar != null && !avatar.isEmpty() && !uniqueAvatars.contains(avatar)) {
                uniqueAvatars.add(avatar);
                recentAvatars.add(avatar);
                if (recentAvatars.size() >= 3) break;
            }
        }

        resultIntent.putStringArrayListExtra(EXTRA_RECENT_AVATARS, recentAvatars);
        setResult(RESULT_THREAD_UPDATED, resultIntent);
    }

    private void checkArticleAccess() {
        OkHttpClient client = new OkHttpClient();

        // Build the URL with the article ID
        String url = "https://api.typepilot.app/v1/room/article/" + articleId + "/check-access";

        Request request = new Request.Builder()
                .url(url)
                .get()
                .addHeader("Authorization", "Bearer " + access)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
               runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                    if (loadingDialog != null) {
                        loadingDialog.dismiss();
                    }
                    Toast.makeText(ThreadReplyActivityOnline.this,
                            "Failed to check room access", Toast.LENGTH_SHORT).show();
                });
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                try {
                    String jsonData = response.body().string();
                    JSONObject jsonObject = new JSONObject(jsonData);

                    boolean success = jsonObject.optBoolean("success", false);

                    if (success) {
                        boolean hasAccess = jsonObject.optBoolean("has_access", false);
                        boolean isMember = jsonObject.optBoolean("is_member", false);
                        boolean isGuest = jsonObject.optBoolean("is_guest", false);
                        isPrivate = jsonObject.optBoolean("is_private", false);

                       runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                            if (loadingDialog != null) {
                                loadingDialog.dismiss();
                            }
                            if (!(isGuest || isMember)) {
                                // User doesn't have access
                                if (!isPrivate) {
                                    needsToJoin = true;
                                    // Show a subtle indicator that user needs to join to reply

                                }
                            }
                        });
                    } else {
                        String errorMessage = jsonObject.optString("error", "Unknown error");
                       runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                            if (loadingDialog != null) {
                                loadingDialog.dismiss();
                            }
                            Toast.makeText(ThreadReplyActivityOnline.this,
                                    "Error: " + errorMessage, Toast.LENGTH_SHORT).show();
                        });
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        if (loadingDialog != null) {
                            loadingDialog.dismiss();
                        }
                        Toast.makeText(ThreadReplyActivityOnline.this,
                                "Error parsing access check response", Toast.LENGTH_SHORT).show();
                    });
                }
            }
        });
    }

    // Add method to show join hint


    // Add method to show join room dialog (copied from SpaceThreadActivityOnline)
    private void showJoinRoomDialog(boolean isPrivate, String preservedMessage) {
        AlertDialog.Builder builder = new androidx.appcompat.app.AlertDialog.Builder(this, R.style.AlertDialogTheme);

        // Inflate custom layout
        View dialogView = getLayoutInflater().inflate(R.layout.dialog_join_room, null);
        builder.setView(dialogView);

        // Find views in custom layout
        TextView titleView = dialogView.findViewById(R.id.dialog_title);
        TextView messageView = dialogView.findViewById(R.id.dialog_message);
        Button joinButton = dialogView.findViewById(R.id.dialog_join_button);
        Button ignoreButton = dialogView.findViewById(R.id.dialog_ignore_button);

        // Set dialog content
        titleView.setText("Join This Hot Room");

        String message = "Joining this hot room will give you access to the network of this hot room " +
                "and ability to discuss, debate and ask questions with AI together with room members. " +
                "Every time there is any update related to this topic in this room, you will be " +
                "notified to jump into the conversation instantly.";

        messageView.setText(message);

        // Create and show dialog
        final androidx.appcompat.app.AlertDialog dialog = builder.create();
        dialog.setCancelable(false); // Prevent dismissal by back button or outside touch

        // Set button actions
        joinButton.setOnClickListener(v -> {
            dialog.dismiss();
            if (isPrivate) {
                // Can't join private rooms directly
                Toast.makeText(ThreadReplyActivityOnline.this,
                        "This room is private. You need an invitation to join.",
                        Toast.LENGTH_LONG).show();
                // Restore the preserved message
                restorePreservedMessage(preservedMessage);
            } else {
                // Join as guest for public room
                joinAsGuest(preservedMessage);
            }
        });

        ignoreButton.setOnClickListener(v -> {
            dialog.dismiss();
            // Restore the preserved message so user doesn't lose their text
            restorePreservedMessage(preservedMessage);
        });

        // Show dialog
        dialog.show();
    }

    // Add method to join as guest (copied from SpaceThreadActivityOnline)
    private void joinAsGuest(String preservedMessage) {


        OkHttpClient client = new OkHttpClient();

        JSONObject jsonBody = new JSONObject();
        try {
            jsonBody.put("articleId", articleId);
        } catch (JSONException e) {
            e.printStackTrace();
            if (loadingDialog != null) {
                loadingDialog.dismiss();
            }
            Toast.makeText(this, "Error joining room", Toast.LENGTH_SHORT).show();
            restorePreservedMessage(preservedMessage);
            return;
        }

        RequestBody body = RequestBody.create(
                MediaType.parse("application/json"),
                jsonBody.toString()
        );

        Request request = new Request.Builder()
                .url("https://api.typepilot.app/v1/room/article/join-as-guest")
                .post(body)
                .addHeader("Content-Type", "application/json")
                .addHeader("Authorization", "Bearer " + access)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
               runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                    if (loadingDialog != null) {
                        loadingDialog.dismiss();
                    }
                    Toast.makeText(ThreadReplyActivityOnline.this,
                            "Failed to join room", Toast.LENGTH_SHORT).show();
                    restorePreservedMessage(preservedMessage);
                });
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
               runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                    if (loadingDialog != null) {
                        loadingDialog.dismiss();
                    }
                });

                if (response.isSuccessful()) {
                    try {
                        String responseData = response.body().string();
                        JSONObject jsonResponse = new JSONObject(responseData);
                        boolean success = jsonResponse.optBoolean("success", false);

                        if (success) {
                            // Successfully joined
                           runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                                Toast.makeText(ThreadReplyActivityOnline.this,
                                        "Successfully joined room", Toast.LENGTH_SHORT).show();

                                // Clear the need to join flag
                                needsToJoin = false;

                                // Hide the join hint
                                TextInputLayout messageInputLayout = findViewById(R.id.threadMessageInputLayout);
                                if (messageInputLayout != null) {
                                    messageInputLayout.setHelperText(null);
                                }

                                // Restore the preserved message and attempt to send it
                                restorePreservedMessage(preservedMessage);

                                // If there was a preserved message, automatically try to send it
                                if (preservedMessage != null && !preservedMessage.trim().isEmpty()) {
                                    // Small delay to ensure UI is updated
                                    new Handler(Looper.getMainLooper()).postDelayed(() -> {
                                        String currentText = messageInput.getText().toString().trim();
                                        if (!currentText.isEmpty()) {
                                            sendReply(currentText);
                                        }
                                    }, 500);
                                }
                            });
                        } else {
                            // Failed to join
                            String errorMessage = jsonResponse.optString("error", "Unknown error");
                           runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                                Toast.makeText(ThreadReplyActivityOnline.this,
                                        "Failed to join room: " + errorMessage, Toast.LENGTH_SHORT).show();
                                restorePreservedMessage(preservedMessage);
                            });
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                       runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                            Toast.makeText(ThreadReplyActivityOnline.this,
                                    "Error processing response", Toast.LENGTH_SHORT).show();
                            restorePreservedMessage(preservedMessage);
                        });
                    }
                } else {
                   runOnUiThread(() -> {
                    if (!isUiSafe()) return;
                        Toast.makeText(ThreadReplyActivityOnline.this,
                                "Failed to join room: " + response.code(), Toast.LENGTH_SHORT).show();
                        restorePreservedMessage(preservedMessage);
                    });
                }
            }
        });
    }

    private void silentlyJoinAsGuest() {
        OkHttpClient client = new OkHttpClient();

        JSONObject jsonBody = new JSONObject();
        try {
            jsonBody.put("articleId", articleId);
        } catch (JSONException e) {
            // Fail silently
            return;
        }

        RequestBody body = RequestBody.create(
                MediaType.parse("application/json"),
                jsonBody.toString()
        );

        Request request = new Request.Builder()
                .url("https://api.typepilot.app/v1/room/article/join-as-guest")
                .post(body)
                .addHeader("Content-Type", "application/json")
                .addHeader("Authorization", "Bearer " + access)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                // Fail silently
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) {
                // Success or failure — do nothing

                initializeSocket();
            }
        });
    }


    private void restorePreservedMessage(String preservedMessage) {
        if (preservedMessage != null && !preservedMessage.trim().isEmpty()) {
            messageInput.setText(preservedMessage);
            messageInput.setSelection(messageInput.getText().length());
            // Re-enable the UI
            resetMessageUI();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        hasLoadedRecentMessages=false;
        isActivityVisible = true;

        isActivityInForeground = true;
        updatePillandShow(true);
        silentlyLoadRecentMessages(true);
        if(socketManager!=null){
            socketManager.forceReconnect();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        isActivityVisible = false;

        // Store the newest message info for comparison on resume
        storeLastVisibleMessageInfo();

        // Mark that we need to check for newer messages when we come back
        needsNewerMessagesCheck = true;

        // Cancel any pending reconnection attempts
        if (reconnectHandler != null && reconnectRunnable != null) {
            reconnectHandler.removeCallbacks(reconnectRunnable);
        }
        isActivityInForeground = false;

        Log.d("ThreadReply", "🟡 Activity paused");

        // Store last visible message info
        storeLastVisibleMessageInfo();

        // Stop typing indicator
        if (socketManager != null) {
            socketManager.sendTypingStop();
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        // Disconnect socket to save resources when activity is not visible
        if (socket != null && socket.connected()) {
            socket.disconnect();
            isSocketConnected = false;
        }
    }

    /**
     * Finds messages that are newer than our stored last message
     */
    private List<Opinion> findNewerMessages(List<Opinion> latestMessages) {
        List<Opinion> newerMessages = new ArrayList<>();
        List<Opinion> currentList = repliesAdapter.getCurrentList();

        // Create a set of existing message IDs for quick lookup
        Set<String> existingIds = new HashSet<>();
        for (Opinion existing : currentList) {
            existingIds.add(existing.getId());
        }

        // Find the position of our last known message in the latest list
        int lastKnownIndex = -1;
        for (int i = 0; i < latestMessages.size(); i++) {
            if (latestMessages.get(i).getId().equals(lastKnownNewestMessageId)) {
                lastKnownIndex = i;
                break;
            }
        }

        if (lastKnownIndex == -1) {
            // Our last known message is not in the latest batch
            // This could mean there are many new messages, so we need to be more careful
            Log.d("ThreadReplyActivity", "Last known message not found in latest batch, checking by timestamp and ID");

            // Fall back to timestamp and ID comparison
            for (Opinion message : latestMessages) {
                // Only include messages that are:
                // 1. Not already in our current list
                // 2. Newer than our last known timestamp
                if (!existingIds.contains(message.getId()) &&
                        message.getTimestamp() > lastVisibleTimestamp) {
                    newerMessages.add(message);
                }
            }
        } else {
            // Get all messages after our last known message
            for (int i = lastKnownIndex + 1; i < latestMessages.size(); i++) {
                Opinion message = latestMessages.get(i);
                if (!existingIds.contains(message.getId())) {
                    newerMessages.add(message);
                }
            }
        }

        Log.d("ThreadReplyActivity", "Found " + newerMessages.size() + " newer messages out of " +
                latestMessages.size() + " total latest messages");

        return newerMessages;
    }

    /**
     * Adds newer messages to the current list without duplicates
     */
    private void addNewerMessagesToList(List<Opinion> newerMessages) {
        List<Opinion> currentList = new ArrayList<>(repliesAdapter.getCurrentList());

        // Add new messages to the end (newest at bottom for WhatsApp style)
        currentList.addAll(newerMessages);

        // Sort to maintain proper chronological order
        Collections.sort(currentList, (o1, o2) -> Long.compare(o1.getTimestamp(), o2.getTimestamp()));

        // Update the adapter
        repliesAdapter.submitList(currentList);

        // Update replies count
        replies += newerMessages.size();
        String repliesText = replies == 1 ? "1 reply" : replies + " replies";
        repliesCountText.setText(repliesText);

        // Auto-scroll to show new messages if user was near the bottom
        scrollToNewMessagesIfAppropriate(newerMessages.size());

        // Update our stored info with the newest message
        if (!newerMessages.isEmpty()) {
            Opinion newestMessage = null;
            long newestTimestamp = 0;

            for (Opinion message : newerMessages) {
                if (message.getTimestamp() > newestTimestamp) {
                    newestTimestamp = message.getTimestamp();
                    newestMessage = message;
                }
            }

            if (newestMessage != null) {
                lastVisibleTimestamp = newestTimestamp;
                lastKnownNewestMessageId = newestMessage.getId();
            }
        }
    }

    /**
     * Scrolls to new messages if user was near the bottom of the conversation
     */
    private void scrollToNewMessagesIfAppropriate(int newMessageCount) {
        LinearLayoutManager layoutManager = (LinearLayoutManager) messagesRecyclerView.getLayoutManager();
        if (layoutManager == null) return;

        int lastVisiblePosition = layoutManager.findLastVisibleItemPosition();
        int totalItems = repliesAdapter.getItemCount();

        // If user was near the bottom (within 3 messages), auto-scroll to show new messages
        if (lastVisiblePosition >= totalItems - newMessageCount - 3) {
            messagesRecyclerView.post(() -> {
                messagesRecyclerView.smoothScrollToPosition(totalItems - 1);
            });
        }
    }

    /**
     * Shows a subtle notification about new messages
     */
    private void showNewMessagesNotification(int count) {
        String message = count == 1 ? "1 new message" : count + " new messages";

        // Use Snackbar for subtle notification
        Snackbar snackbar = Snackbar.make(messagesRecyclerView, message, Snackbar.LENGTH_SHORT);
        snackbar.setBackgroundTint(ContextCompat.getColor(this, R.color.colorAccent));
        snackbar.setTextColor(Color.WHITE);
        snackbar.show();
    }

    /**
     * Enhanced socket reconnection with better error handling
     */
    private void checkAndReconnectSocket() {
        if (socket == null || !socket.connected()) {
            Log.d("ThreadReplyActivity", "Socket disconnected, attempting to reconnect...");
            initializeSocketWithReconnection();
        } else {
            Log.d("ThreadReplyActivity", "Socket already connected");
            isSocketConnected = true;
            // Re-join the room to ensure we're still subscribed
            joinArticleRoom();
        }
    }

    /**
     * Enhanced socket initialization with better reconnection handling
     */
    private void initializeSocketWithReconnection() {
        try {
            // Clean up any existing socket connection
            if (socket != null) {
                socket.off();
                socket.disconnect();
            }

            // Configure socket options with better defaults
            IO.Options options = new IO.Options();
            options.query = "token=" + access;
            options.reconnection = true;
            options.reconnectionAttempts = RECONNECTION_ATTEMPTS;
            options.reconnectionDelay = RECONNECTION_DELAY;
            options.timeout = CONNECTION_TIMEOUT;
            options.forceNew = true;

            socket = IO.socket("wss://api.typepilot.app", options);

            // Setup connection event handlers
            setupEnhancedSocketEventHandlers();

            // Connect to socket
            Log.d("ThreadReplyActivity", "Attempting to connect to socket");
            socket.connect();
        } catch (Exception e) {
            Log.e("ThreadReplyActivity", "Error initializing socket", e);

            // Schedule retry if activity is still visible
            if (isActivityVisible) {
                scheduleSocketReconnection();
            }
        }
    }

    /**
     * Schedules a socket reconnection attempt
     */
    private void scheduleSocketReconnection() {
        if (reconnectHandler == null) {
            reconnectHandler = new Handler(Looper.getMainLooper());
        }

        // Cancel any existing reconnection attempt
        if (reconnectRunnable != null) {
            reconnectHandler.removeCallbacks(reconnectRunnable);
        }

        reconnectRunnable = () -> {
            if (isActivityVisible && !isFinishing() && !isDestroyed()) {
                Log.d("ThreadReplyActivity", "Retrying socket connection...");
                initializeSocketWithReconnection();
            }
        };

        // Retry after 5 seconds
        reconnectHandler.postDelayed(reconnectRunnable, 5000);
    }

    /**
     * Enhanced socket event handlers with better error handling
     */
    private void setupEnhancedSocketEventHandlers() {
        // Connection event handlers
        socket.on(Socket.EVENT_CONNECT, args -> {
            Log.d("ThreadReplyActivity", "Socket connected successfully");
            isSocketConnected = true;

            // Cancel any pending reconnection attempts
            if (reconnectHandler != null && reconnectRunnable != null) {
                reconnectHandler.removeCallbacks(reconnectRunnable);
            }

            // Join the article room after successful connection
            joinArticleRoom();

            // Update UI to indicate connection
            runOnUiThread(this::hideConnectionError);
        });

        socket.on(Socket.EVENT_CONNECT_ERROR, args -> {
            isSocketConnected = false;
            String errorMessage = args.length > 0 ? args[0].toString() : "Unknown connection error";
            Log.e("ThreadReplyActivity", "Socket connection error: " + errorMessage);

            // Schedule reconnection if activity is visible
            if (isActivityVisible) {
                scheduleSocketReconnection();
            }
        });

        socket.on(Socket.EVENT_DISCONNECT, args -> {
            isSocketConnected = false;
            Log.d("ThreadReplyActivity", "Socket disconnected");

            // Schedule reconnection if activity is visible and disconnect was unexpected
            if (isActivityVisible) {
                scheduleSocketReconnection();
            }
        });

        // Keep your existing business logic event handlers
        setupBusinessEventHandlers();
    }
}